import { expect, it } from 'vitest'
import type { ScrumApi } from './api.js'

export type SprintProjectAcceptanceDeps = {
	/** A scrum api whose scope has a backlog project, an empty sprint portfolio, the `project` model, and sprint_anchor_date set. */
	getApi: () => Pick<
		ScrumApi,
		'startSprint' | 'addToSprint' | 'closeSprint' | 'sprintTasks' | 'listSprints' | 'listBacklog'
	>
	/** A task in the backlog project. */
	createTask: (name: string) => Promise<string>
	/** The names of the projects the task is in. */
	homesOf: (taskGid: string) => Promise<string[]>
	deleteTask: (taskGid: string) => Promise<void>
	/** Deletes the portfolio's projects with these names. */
	deleteSprintProjects: (names: string[]) => Promise<void>
}

// Far from any real sprint, so the probe projects never clash with a team's own.
const FIRST = 9001
const SECOND = 9002
const NAMES = [`Sprint ${FIRST}`, `Sprint ${SECOND}`]

/**
 * The Asana call shapes the `project` sprint model relies on: a project created (or duplicated) per
 * sprint and added to a portfolio, a task multi-homed into it, and a close that moves an incomplete
 * task to the next sprint's project. Probes and cleans up its own task and projects.
 */
export function defineSprintProjectAcceptanceSpecs(deps: SprintProjectAcceptanceDeps) {
	return () => {
		it('starts a sprint as a project, multi-homes a task into it, and carries it over on close', async () => {
			const api = deps.getApi()
			const taskGid = await deps.createTask('cyber-asana sprint project probe')
			try {
				const started = await api.startSprint({ sprint: String(FIRST) })
				expect(started.sprint.name).toBe(NAMES[0])
				expect(started.already_started).toBe(false)
				expect(started.sprint_project?.name).toBe(NAMES[0])
				expect((await api.startSprint({ sprint: String(FIRST) })).already_started).toBe(true)

				expect((await api.listBacklog({})).tasks.map((t) => t.gid)).toContain(taskGid)

				const added = await api.addToSprint({ sprint: String(FIRST), tasks: [taskGid] })
				expect(added.added.map((a) => a.task)).toEqual([taskGid])
				expect(await deps.homesOf(taskGid)).toContain(NAMES[0])
				expect((await api.addToSprint({ sprint: String(FIRST), tasks: [taskGid] })).already_in_sprint).toEqual([
					taskGid,
				])

				expect((await api.sprintTasks({ sprint: String(FIRST) })).tasks.map((t) => t.gid)).toContain(taskGid)
				expect((await api.listBacklog({})).tasks.map((t) => t.gid)).not.toContain(taskGid)

				const closed = await api.closeSprint({ sprint: String(FIRST) })
				expect(closed.next_sprint.name).toBe(NAMES[1])
				expect(closed.moved.map((m) => m.task)).toEqual([taskGid])
				const homes = await deps.homesOf(taskGid)
				expect(homes).toContain(NAMES[1])
				expect(homes).not.toContain(NAMES[0])

				expect((await api.listSprints({})).sprints.map((s) => s.n)).toEqual(expect.arrayContaining([FIRST, SECOND]))
			} finally {
				await deps.deleteTask(taskGid)
				await deps.deleteSprintProjects(NAMES)
			}
		})
	}
}
