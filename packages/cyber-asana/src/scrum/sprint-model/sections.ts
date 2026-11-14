import { listItems } from '../../platform/pagination.js'
import type { SectionGateway } from '../../sections/gateway.js'
import type { TaskGateway } from '../../tasks/gateway.js'
import type { ScopeProject } from '../scope.js'
import { nameMatcher, resolveMatch } from '../sprint.js'
import type { SprintModel, SprintSection, SprintTask } from './types.js'

export type SectionsModelGateways = {
	sections: Pick<SectionGateway, 'listSections' | 'createSection' | 'addTaskToSection'>
	tasks: Pick<TaskGateway, 'listTasksForSection' | 'getTask'>
}

type Section = { gid: string; name: string }

const DEFAULT_FIELDS = 'gid,name,completed,assignee.name'

/**
 * The `sections` sprint model (docs/design/scrum-system.md § 4.2): a sprint is a section named by
 * `sprint_name_format` in each project of the scope, and the backlog is every other section's
 * incomplete tasks. It reads sections and their tasks only, so it works on a free workspace.
 */
export function createSectionsModel(gateways: SectionsModelGateways): SprintModel {
	async function projectSections(project: ScopeProject): Promise<Section[]> {
		return listItems(
			await gateways.sections.listSections(project.gid, { fetchAll: true, optFields: 'gid,name' }),
		) as Section[]
	}

	async function sectionTasks(section: Section, opts: { incomplete?: boolean; optFields?: string }) {
		return listItems(
			await gateways.tasks.listTasksForSection(section.gid, {
				fetchAll: true,
				optFields: opts.optFields ?? DEFAULT_FIELDS,
				...(opts.incomplete && { incompleteOrCompletedSince: 'now' }),
			}),
		) as SprintTask[]
	}

	const model: SprintModel = {
		async sections(target, sprint) {
			const found: SprintSection[] = []
			const missing: ScopeProject[] = []
			for (const project of target.projects) {
				const section = (await projectSections(project)).find((s) => s.name === sprint.name)
				if (section) found.push({ project, section })
				else missing.push(project)
			}
			return { found, missing }
		},

		async listSprints(target) {
			const matcher = nameMatcher({ sprint_name_format: target.settings.sprint_name_format })
			const byIndex = new Map<number, SprintSection[]>()
			for (const project of target.projects) {
				for (const section of await projectSections(project)) {
					const match = matcher.exec(section.name)
					if (!match) continue
					const n = resolveMatch(match, target.settings)
					byIndex.set(n, [...(byIndex.get(n) ?? []), { project, section }])
				}
			}
			return [...byIndex.entries()].sort(([a], [b]) => a - b).map(([n, sections]) => ({ n, sections }))
		},

		async tasks(target, sprint, opts) {
			const { found } = await model.sections(target, sprint)
			const seen = new Map<string, SprintTask>()
			for (const { section } of found) {
				for (const task of await sectionTasks(section, opts)) if (!seen.has(task.gid)) seen.set(task.gid, task)
			}
			return [...seen.values()]
		},

		async backlog(target, opts) {
			const matcher = nameMatcher({ sprint_name_format: target.settings.sprint_name_format })
			const inSprint = new Set<string>()
			const candidates: Array<SprintTask & { section: string; project: string }> = []
			for (const project of target.projects) {
				for (const section of await projectSections(project)) {
					if (matcher.test(section.name)) {
						for (const task of await sectionTasks(section, { incomplete: true, optFields: 'gid' }))
							inSprint.add(task.gid)
					} else {
						for (const task of await sectionTasks(section, { incomplete: true, ...opts })) {
							candidates.push({ ...task, section: section.name, project: project.gid })
						}
					}
				}
			}
			const seen = new Set<string>()
			return candidates.filter((task) => {
				if (inSprint.has(task.gid) || seen.has(task.gid)) return false
				seen.add(task.gid)
				return true
			})
		},

		async start(target, sprint) {
			const { found, missing } = await model.sections(target, sprint)
			for (const project of missing) await gateways.sections.createSection(project.gid, sprint.name)
			return { created: missing, existing: found.map((f) => f.project) }
		},

		async add(target, sprint, taskGids) {
			const { found, missing } = await model.sections(target, sprint)
			const added: Array<{ task: string; project: string; from?: string }> = []
			const already: string[] = []
			const outside: string[] = []
			for (const taskGid of taskGids) {
				const task = await gateways.tasks.getTask(taskGid, {
					optFields: 'memberships.project.gid,memberships.section.gid,memberships.section.name',
				})
				const memberships = (task.memberships ?? []) as Array<{ project?: { gid?: string }; section?: Section }>
				let inScope = false
				let moved = false
				for (const home of found) {
					const membership = memberships.find((m) => m.project?.gid === home.project.gid)
					if (!membership) continue
					inScope = true
					if (membership.section?.gid === home.section.gid) continue
					await gateways.sections.addTaskToSection(home.section.gid, taskGid)
					moved = true
					added.push({
						task: taskGid,
						project: home.project.gid,
						...(membership.section?.name !== undefined && { from: membership.section.name }),
					})
				}
				if (!inScope && !memberships.some((m) => target.projects.some((p) => p.gid === m.project?.gid)))
					outside.push(taskGid)
				else if (!moved && inScope) already.push(taskGid)
			}
			return { added, already, outside_scope: outside, missing }
		},

		async close(target, sprint, next, carryOver) {
			const { found } = await model.sections(target, sprint)
			const open: Array<{ task: string; project: ScopeProject }> = []
			for (const { project, section } of found) {
				for (const task of await sectionTasks(section, { incomplete: true, optFields: 'gid' })) {
					open.push({ task: task.gid, project })
				}
			}
			const plain = (items: typeof open) => items.map((o) => ({ task: o.task, project: o.project.gid }))
			if (carryOver === 'leave' || open.length === 0) return { moved: [], left: plain(open), created_next: [] }
			const { created } = await model.start(target, next)
			const { found: nextSections } = await model.sections(target, next)
			const moved = []
			for (const item of open) {
				const to = nextSections.find((n) => n.project.gid === item.project.gid)
				if (!to) continue
				await gateways.sections.addTaskToSection(to.section.gid, item.task)
				moved.push(item)
			}
			return { moved: plain(moved), left: [], created_next: created }
		},
	}
	return model
}
