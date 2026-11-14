import type { ScopeProject } from '../scope.js'
import type { Sprint, SprintSettings } from '../sprint.js'

/** What a sprint model works on: the scope's projects and the effective sprint settings. */
export type SprintTarget = {
	projects: ScopeProject[]
	settings: SprintSettings
	/** The policy's `backlog_section`. */
	backlogSection: string
	/** The Sprint field GID each project registered in config, by project GID; discovery fills any gap. */
	sprintFields?: Record<string, string>
	/** The `project` model's Asana objects, resolved from the scope; `projects` is then just the backlog. */
	sprintProject?: { backlog: ScopeProject; portfolio: string; template?: string }
}

export type SprintSection = { project: ScopeProject; section: { gid: string; name: string } }

export type SprintTask = { gid: string } & Record<string, unknown>

export type CarryOver = 'move' | 'leave'

/** One implementation of `cyber-asana.sprint-model`, for the models the CLI builds in. */
export type SprintModel = {
	/** What stands for a sprint in Asana, for messages: a section, an option of the Sprint field, or a project. */
	kind: 'section' | 'option' | 'project'
	/** The sprint's Asana object in each project, and the projects that lack it. */
	sections(
		target: SprintTarget,
		sprint: Pick<Sprint, 'name'>,
	): Promise<{ found: SprintSection[]; missing: ScopeProject[] }>
	/** The sprints that exist in at least one project, by index. */
	listSprints(target: SprintTarget): Promise<Array<{ n: number; sections: SprintSection[] }>>
	tasks(target: SprintTarget, sprint: Sprint, opts: { incomplete?: boolean; optFields?: string }): Promise<SprintTask[]>
	backlog(
		target: SprintTarget,
		opts: { optFields?: string },
	): Promise<Array<SprintTask & { section: string; project: string }>>
	start(
		target: SprintTarget,
		sprint: Sprint,
	): Promise<{
		created: ScopeProject[]
		existing: ScopeProject[]
		/** The project a `project` model made, so a caller can name it. */
		sprintProject?: { gid: string; name: string }
	}>
	add(
		target: SprintTarget,
		sprint: Sprint,
		taskGids: string[],
	): Promise<{
		added: Array<{ task: string; project: string; from?: string }>
		already: string[]
		outside_scope: string[]
		missing: ScopeProject[]
	}>
	close(
		target: SprintTarget,
		sprint: Sprint,
		next: Sprint,
		carryOver: CarryOver,
	): Promise<{
		moved: Array<{ task: string; project: string }>
		left: Array<{ task: string; project: string }>
		created_next: ScopeProject[]
	}>
}
