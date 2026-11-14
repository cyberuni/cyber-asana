import { expect, it } from 'vitest'
import type { ScrumApi } from './api.js'

export type SprintCustomFieldAcceptanceDeps = {
	/** A scrum api whose scope is one project with a `Sprint` enum field attached, the `custom-field` model, and sprint_anchor_date set. */
	getApi: () => Pick<
		ScrumApi,
		'startSprint' | 'addToSprint' | 'closeSprint' | 'sprintTasks' | 'listSprints' | 'listBacklog'
	>
	/** A task in the project with no Sprint value. */
	createTask: (name: string) => Promise<string>
	/** The name of the task's Sprint option, or undefined when unset. */
	sprintOf: (taskGid: string) => Promise<string | undefined>
	deleteTask: (taskGid: string) => Promise<void>
	/** Disables the field's options with these names; Asana cannot delete an enum option. */
	disableOptions: (names: string[]) => Promise<void>
	/** Search is eventually consistent; how long to keep retrying a read, in ms. Zero for a double. */
	settleMs?: number
}

// Far from any real sprint, so the probe options never clash with a team's own.
const FIRST = 9001
const SECOND = 9002
const NAMES = [`Sprint ${FIRST}`, `Sprint ${SECOND}`]

async function eventually<T>(read: () => Promise<T>, ok: (value: T) => boolean, settleMs: number): Promise<T> {
	const deadline = Date.now() + settleMs
	for (;;) {
		const value = await read()
		if (ok(value) || Date.now() >= deadline) return value
		await new Promise((resolve) => setTimeout(resolve, 1000))
	}
}

/**
 * The Asana call shapes the `custom-field` sprint model relies on: an enum option created under a
 * computed sprint name, a task's Sprint field set to it, and task search filtered on the field's value
 * and on `is_set`. Probes and cleans up its own task and options. Needs a premium workspace.
 */
export function defineSprintCustomFieldAcceptanceSpecs(deps: SprintCustomFieldAcceptanceDeps) {
	const settle = deps.settleMs ?? 0
	return () => {
		it('starts a sprint as an option, sets a task into it, lists it by search, and carries it over on close', async () => {
			const api = deps.getApi()
			const taskGid = await deps.createTask('cyber-asana sprint custom-field probe')
			try {
				const started = await api.startSprint({ sprint: String(FIRST) })
				expect(started.sprint.name).toBe(NAMES[0])
				expect(started.already_started).toBe(false)
				expect((await api.startSprint({ sprint: String(FIRST) })).already_started).toBe(true)

				// custom_fields.{gid}.is_set=false: the task has no Sprint value yet.
				const backlog = await eventually(
					() => api.listBacklog({}),
					(b) => b.tasks.some((t) => t.gid === taskGid),
					settle,
				)
				expect(backlog.tasks.map((t) => t.gid)).toContain(taskGid)

				const added = await api.addToSprint({ sprint: String(FIRST), tasks: [taskGid] })
				expect(added.added.map((a) => a.task)).toEqual([taskGid])
				expect(await deps.sprintOf(taskGid)).toBe(NAMES[0])
				expect((await api.addToSprint({ sprint: String(FIRST), tasks: [taskGid] })).already_in_sprint).toEqual([
					taskGid,
				])

				// custom_fields.{gid}.value: the sprint option's GID.
				const listed = await eventually(
					() => api.sprintTasks({ sprint: String(FIRST) }),
					(l) => l.tasks.some((t) => t.gid === taskGid),
					settle,
				)
				expect(listed.tasks.map((t) => t.gid)).toContain(taskGid)
				const leftBacklog = await eventually(
					() => api.listBacklog({}),
					(b) => !b.tasks.some((t) => t.gid === taskGid),
					settle,
				)
				expect(leftBacklog.tasks.map((t) => t.gid)).not.toContain(taskGid)

				const closed = await api.closeSprint({ sprint: String(FIRST) })
				expect(closed.next_sprint.name).toBe(NAMES[1])
				expect(closed.moved.map((m) => m.task)).toEqual([taskGid])
				expect(await deps.sprintOf(taskGid)).toBe(NAMES[1])

				expect((await api.listSprints({})).sprints.map((s) => s.n)).toEqual(expect.arrayContaining([FIRST, SECOND]))
			} finally {
				await deps.deleteTask(taskGid)
				await deps.disableOptions(NAMES)
			}
		})
	}
}
