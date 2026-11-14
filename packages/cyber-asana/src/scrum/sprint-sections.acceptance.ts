import { expect, it } from 'vitest'
import type { ScrumApi } from './api.js'

export type SprintSectionsAcceptanceDeps = {
	/** A scrum api whose scope is the one project, with sprint_anchor_date set and the default name format. */
	getApi: () => Pick<ScrumApi, 'startSprint' | 'addToSprint' | 'closeSprint' | 'sprintTasks' | 'listSprints'>
	/** A task in the project, in whatever section Asana files it under. */
	createTask: (name: string) => Promise<string>
	/** The name of the project section the task sits in. */
	sectionNameOf: (taskGid: string) => Promise<string | undefined>
	deleteTask: (taskGid: string) => Promise<void>
	/** Deletes the project's sections with these names, if they exist. */
	deleteSections: (names: string[]) => Promise<void>
}

// Far from any real sprint, so the probe sections never clash with a team's own.
const FIRST = 9001
const SECOND = 9002
const NAMES = [`Sprint ${FIRST}`, `Sprint ${SECOND}`]

/**
 * The Asana call shapes the `sections` sprint model relies on: a section created under a computed
 * sprint name, and a task moved between sections of one project. Probes and cleans up its own sections.
 */
export function defineSprintSectionsAcceptanceSpecs(deps: SprintSectionsAcceptanceDeps) {
	return () => {
		it('starts a sprint as a named section, moves a task into it, and carries it over on close', async () => {
			const api = deps.getApi()
			const taskGid = await deps.createTask('cyber-asana sprint sections probe')
			try {
				const started = await api.startSprint({ sprint: String(FIRST) })
				expect(started.sprint.name).toBe(NAMES[0])
				expect(started.already_started).toBe(false)

				expect((await api.startSprint({ sprint: String(FIRST) })).already_started).toBe(true)

				const added = await api.addToSprint({ sprint: String(FIRST), tasks: [taskGid] })
				expect(added.added.map((a) => a.task)).toEqual([taskGid])
				expect(await deps.sectionNameOf(taskGid)).toBe(NAMES[0])
				expect((await api.addToSprint({ sprint: String(FIRST), tasks: [taskGid] })).already_in_sprint).toEqual([
					taskGid,
				])

				const listed = await api.sprintTasks({ sprint: String(FIRST) })
				expect(listed.tasks.map((t) => t.gid)).toEqual([taskGid])

				const closed = await api.closeSprint({ sprint: String(FIRST) })
				expect(closed.next_sprint.name).toBe(NAMES[1])
				expect(closed.moved.map((m) => m.task)).toEqual([taskGid])
				expect(await deps.sectionNameOf(taskGid)).toBe(NAMES[1])

				expect((await api.listSprints({})).sprints.map((s) => s.n)).toEqual(expect.arrayContaining([FIRST, SECOND]))
			} finally {
				await deps.deleteTask(taskGid)
				await deps.deleteSections(NAMES)
			}
		})
	}
}
