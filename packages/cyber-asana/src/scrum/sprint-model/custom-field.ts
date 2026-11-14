import { matchFieldRole } from '../../config/project-fields.js'
import type { CustomFieldGateway } from '../../custom-fields/gateway.js'
import { CodedConfigError } from '../../platform/coded-error.js'
import { listItems } from '../../platform/pagination.js'
import type { ProjectGateway } from '../../projects/gateway.js'
import type { SearchTasksOptions, TaskGateway } from '../../tasks/gateway.js'
import { searchAllPages } from '../../tasks/search-paging.js'
import type { ScopeProject } from '../scope.js'
import { nameMatcher, resolveMatch } from '../sprint.js'
import type { SprintModel, SprintSection, SprintTarget, SprintTask } from './types.js'

export type CustomFieldModelGateways = {
	customFields: Pick<CustomFieldGateway, 'listCustomFieldSettingsForProject' | 'getCustomField' | 'createEnumOption'>
	tasks: Pick<TaskGateway, 'searchTasks' | 'getTask' | 'updateTask'>
	projects: Pick<ProjectGateway, 'getProject'>
}

type EnumOption = { gid: string; name?: string; enabled?: boolean }
type Membership = { project?: { gid?: string }; section?: { name?: string } }
type FieldTask = SprintTask & { memberships?: Membership[] }

const DEFAULT_FIELDS = 'gid,name,completed,assignee.name'

const isPaymentRequired = (error: unknown) =>
	(error as { response?: { status?: number } } | null)?.response?.status === 402

/**
 * The `custom-field` sprint model (docs/design/scrum-system.md § 4.2): a sprint is an option of the
 * `Sprint` enum field, and the backlog is every incomplete task whose Sprint field is unset. Listing
 * tasks uses task search, which is a premium feature, so a free workspace gets `premium-required`.
 */
export function createCustomFieldModel(gateways: CustomFieldModelGateways): SprintModel {
	/** The one Sprint field the scope's projects share, and the projects it is attached to. */
	async function resolveField(target: SprintTarget) {
		const byField = new Map<string, ScopeProject[]>()
		for (const project of target.projects) {
			let fieldGid = target.sprintFields?.[project.gid]
			if (!fieldGid) {
				const settings = listItems(
					(await gateways.customFields.listCustomFieldSettingsForProject(project.gid, {
						fetchAll: true,
						optFields: 'custom_field.gid,custom_field.name,custom_field.resource_subtype',
					})) as never,
				) as Array<{ custom_field?: { gid?: string; name?: string; resource_subtype?: string } | null }>
				fieldGid = settings.find(
					(s) =>
						s.custom_field?.gid &&
						matchFieldRole({
							name: s.custom_field.name ?? '',
							...(s.custom_field.resource_subtype && { resource_subtype: s.custom_field.resource_subtype }),
						}) === 'sprint',
				)?.custom_field?.gid
			}
			if (fieldGid) byField.set(fieldGid, [...(byField.get(fieldGid) ?? []), project])
		}
		if (byField.size === 0) {
			throw new CodedConfigError('sprint-field-missing', 'No project of the scope has a Sprint enum field', {
				hint: 'Create and attach one with: cyber-asana custom-field create Sprint --type enum --workspace-gid <gid>, then cyber-asana custom-field attach <project-gid> <field-gid>. Or run init-asana-scrum.',
			})
		}
		if (byField.size > 1) {
			throw new CodedConfigError('sprint-field-ambiguous', 'The scope projects use more than one Sprint field', {
				options: [...byField.keys()],
				hint: 'A scope shares one Sprint field. Attach the same field to every project, or split the scope.',
			})
		}
		const [fieldGid, attached] = [...byField.entries()][0] as [string, ScopeProject[]]
		return { fieldGid, attached }
	}

	async function fieldOptions(fieldGid: string): Promise<EnumOption[]> {
		const field = (await gateways.customFields.getCustomField(fieldGid, {
			optFields: 'enum_options.gid,enum_options.name,enum_options.enabled',
		})) as { enum_options?: EnumOption[] }
		return (field.enum_options ?? []).filter((o) => o.enabled !== false)
	}

	async function workspaceOf(target: SprintTarget): Promise<string> {
		const first = target.projects[0]
		if (!first) throw new CodedConfigError('scope-missing', 'The scope has no projects')
		const project = (await gateways.projects.getProject(first.gid, { optFields: 'workspace.gid' })) as {
			workspace?: { gid?: string }
		}
		if (!project.workspace?.gid) throw new Error(`Could not read the workspace of project ${first.gid}`)
		return project.workspace.gid
	}

	async function search(target: SprintTarget, opts: SearchTasksOptions): Promise<FieldTask[]> {
		const workspace = await workspaceOf(target)
		try {
			const result = await searchAllPages(
				(ws, o) => gateways.tasks.searchTasks(ws, o) as Promise<FieldTask[]>,
				workspace,
				{ projectsAny: target.projects.map((p) => p.gid).join(','), ...opts },
			)
			return result.data
		} catch (error) {
			if (!isPaymentRequired(error)) throw error
			throw new CodedConfigError(
				'premium-required',
				'The custom-field sprint model lists tasks with task search, which needs a premium Asana workspace (Asana answered 402)',
				{
					hint: 'Use the sections sprint model on a free workspace (single project or projects scopes), or move the workspace to a premium plan.',
				},
			)
		}
	}

	const projectOf = (task: FieldTask, target: SprintTarget): string => {
		const inScope = (task.memberships ?? []).find((m) => target.projects.some((p) => p.gid === m.project?.gid))
		return inScope?.project?.gid ?? (target.projects[0] as ScopeProject).gid
	}

	async function option(target: SprintTarget, sprint: { name: string }) {
		const { fieldGid, attached } = await resolveField(target)
		const found = (await fieldOptions(fieldGid)).find((o) => o.name === sprint.name)
		return { fieldGid, attached, option: found }
	}

	const model: SprintModel = {
		kind: 'option',

		async sections(target, sprint) {
			const { attached, option: found } = await option(target, sprint)
			if (!found) return { found: [], missing: target.projects }
			return {
				found: attached.map((project) => ({ project, section: { gid: found.gid, name: found.name ?? sprint.name } })),
				missing: target.projects.filter((p) => !attached.includes(p)),
			}
		},

		async listSprints(target) {
			const { fieldGid, attached } = await resolveField(target)
			const matcher = nameMatcher({ sprint_name_format: target.settings.sprint_name_format })
			const sprints: Array<{ n: number; sections: SprintSection[] }> = []
			for (const o of await fieldOptions(fieldGid)) {
				const match = o.name ? matcher.exec(o.name) : null
				if (!match || !o.name) continue
				const n = resolveMatch(match, target.settings)
				sprints.push({
					n,
					sections: attached.map((project) => ({ project, section: { gid: o.gid, name: o.name as string } })),
				})
			}
			return sprints.sort((a, b) => a.n - b.n)
		},

		async tasks(target, sprint, opts) {
			const { fieldGid, option: found } = await option(target, sprint)
			if (!found) return []
			return search(target, {
				customFields: [{ gid: fieldGid, operator: 'value', value: found.gid }],
				optFields: opts.optFields ?? DEFAULT_FIELDS,
				...(opts.incomplete && { completed: false }),
			})
		},

		async backlog(target, opts) {
			const { fieldGid } = await resolveField(target)
			const tasks = await search(target, {
				completed: false,
				customFields: [{ gid: fieldGid, operator: 'is_set', value: 'false' }],
				optFields: `${opts.optFields ?? DEFAULT_FIELDS},memberships.project.gid,memberships.section.name`,
			})
			return tasks.map((task) => {
				const project = projectOf(task, target)
				const membership = (task.memberships ?? []).find((m) => m.project?.gid === project)
				return { ...task, section: membership?.section?.name ?? '', project }
			})
		},

		async start(target, sprint) {
			const { fieldGid, attached, option: found } = await option(target, sprint)
			if (found) return { created: [], existing: attached }
			await gateways.customFields.createEnumOption(fieldGid, { name: sprint.name })
			return { created: attached, existing: [] }
		},

		async add(target, sprint, taskGids) {
			const { fieldGid, attached, option: found } = await option(target, sprint)
			const added: Array<{ task: string; project: string; from?: string }> = []
			const already: string[] = []
			const outside: string[] = []
			for (const taskGid of taskGids) {
				const task = (await gateways.tasks.getTask(taskGid, {
					optFields:
						'memberships.project.gid,custom_fields.gid,custom_fields.enum_value.gid,custom_fields.enum_value.name',
				})) as unknown as FieldTask & {
					custom_fields?: Array<{ gid?: string; enum_value?: { gid?: string; name?: string } | null }>
				}
				const homes = (task.memberships ?? []).map((m) => m.project?.gid)
				const home = attached.find((p) => homes.includes(p.gid))
				if (!home || !found) {
					outside.push(taskGid)
					continue
				}
				const current = task.custom_fields?.find((f) => f.gid === fieldGid)?.enum_value
				if (current?.gid === found.gid) {
					already.push(taskGid)
					continue
				}
				await gateways.tasks.updateTask(taskGid, { custom_fields: { [fieldGid]: found.gid } })
				added.push({ task: taskGid, project: home.gid, ...(current?.name && { from: current.name }) })
			}
			return { added, already, outside_scope: outside, missing: target.projects.filter((p) => !attached.includes(p)) }
		},

		async close(target, sprint, next, carryOver) {
			const open = await model.tasks(target, sprint, { incomplete: true, optFields: 'gid,memberships.project.gid' })
			const plain = open.map((task) => ({ task: task.gid, project: projectOf(task as FieldTask, target) }))
			if (carryOver === 'leave' || open.length === 0) return { moved: [], left: plain, created_next: [] }
			const { created } = await model.start(target, next)
			const { fieldGid, option: nextOption } = await option(target, next)
			for (const item of plain) {
				await gateways.tasks.updateTask(item.task, { custom_fields: { [fieldGid]: (nextOption as EnumOption).gid } })
			}
			return { moved: plain, left: [], created_next: created }
		},
	}
	return model
}
