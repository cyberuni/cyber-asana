import { vi } from 'vitest'

export type FieldWorldTask = {
	gid: string
	name?: string
	completed?: boolean
	projects: string[]
	/** The Sprint option's name, or unset for backlog. */
	sprint?: string
	section?: string
}

type FilterOpts = {
	projectsAny?: string
	completed?: boolean
	customFields?: Array<{ gid: string; operator: string; value: string }>
	optFields?: string
	createdAtAfter?: string
}

/**
 * An in-memory Asana for the `custom-field` sprint model: one workspace-level `Sprint` enum field with
 * ordered options, attached to some projects, and tasks that carry an option or none. Search needs a
 * premium workspace and otherwise answers 402, as Asana does.
 */
export function createFieldSprintWorld(opts: {
	options?: string[]
	attached: string[]
	tasks?: FieldWorldTask[]
	premium?: boolean
	workspace?: string
}) {
	let next = 500
	const field = { gid: 'f1', name: 'Sprint', resource_subtype: 'enum' }
	const options = (opts.options ?? []).map((name) => ({ gid: `o${next++}`, name, enabled: true }))
	const tasks = (opts.tasks ?? []).map((t) => ({ ...t }))
	const optionByName = (name?: string) => options.find((o) => o.name === name)
	const shape = (t: FieldWorldTask) => ({
		gid: t.gid,
		name: t.name ?? t.gid,
		completed: t.completed === true,
		memberships: t.projects.map((p) => ({
			project: { gid: p },
			section: { gid: `s-${p}`, name: t.section ?? 'Backlog' },
		})),
		custom_fields: [{ gid: field.gid, enum_value: optionByName(t.sprint) ? { ...optionByName(t.sprint) } : null }],
	})
	const gateways = {
		customFields: {
			listCustomFieldSettingsForProject: vi.fn(async (projectGid: string) =>
				opts.attached.includes(projectGid) ? [{ gid: `cfs-${projectGid}`, custom_field: { ...field } }] : [],
			),
			getCustomField: vi.fn(async () => ({ ...field, enum_options: options.map((o) => ({ ...o })) })),
			createEnumOption: vi.fn(async (_fieldGid: string, input: { name: string }) => {
				const option = { gid: `o${next++}`, name: input.name, enabled: true }
				options.push(option)
				return { ...option }
			}),
		},
		projects: {
			getProject: vi.fn(async (gid: string) => ({ gid, workspace: { gid: opts.workspace ?? 'w1' } })),
		},
		tasks: {
			searchTasks: vi.fn(async (_workspace: string, o: FilterOpts = {}) => {
				if (opts.premium === false) {
					throw Object.assign(new Error('Payment Required'), {
						response: { status: 402, body: { errors: [{ message: 'This feature requires a premium plan' }] } },
					})
				}
				const projects = o.projectsAny?.split(',')
				return tasks
					.filter((t) => !projects || t.projects.some((p) => projects.includes(p)))
					.filter((t) => o.completed === undefined || (t.completed === true) === o.completed)
					.filter((t) =>
						(o.customFields ?? []).every((f) => {
							if (f.gid !== field.gid) return true
							if (f.operator === 'is_set') return (optionByName(t.sprint) !== undefined) === (f.value === 'true')
							if (f.operator === 'value') return optionByName(t.sprint)?.gid === f.value
							return true
						}),
					)
					.map(shape)
			}),
			getTask: vi.fn(async (gid: string) => {
				const task = tasks.find((t) => t.gid === gid)
				if (!task) throw new Error(`no task ${gid}`)
				return shape(task)
			}),
			updateTask: vi.fn(async (gid: string, fields: { custom_fields?: Record<string, unknown> }) => {
				const task = tasks.find((t) => t.gid === gid)
				if (!task) throw new Error(`no task ${gid}`)
				const value = fields.custom_fields?.[field.gid]
				task.sprint = options.find((o) => o.gid === value)?.name
				return shape(task)
			}),
		},
	}
	return {
		field,
		options,
		tasks,
		gateways,
		optionNamed: (name: string) => optionByName(name),
		taskNamed: (gid: string) => tasks.find((t) => t.gid === gid),
	}
}
