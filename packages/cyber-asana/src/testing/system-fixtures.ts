import type { RuntimeContext } from '../composition.js'
import { listItems } from '../pagination.js'

export type FixtureContext = Pick<RuntimeContext, 'projects' | 'sections' | 'tasks' | 'stories' | 'attachments'>

export type SystemFixtures = {
	workspaceGid: string
	projectGid: string
	sectionGid: string
	taskGid: string
	secondTaskGid: string
}

const SECTION_NAMES = ['System test A', 'System test B'] as const
const TASK_NAMES = ['System test task 1', 'System test task 2'] as const
const COMMENTS = ['System test comment 1', 'System test comment 2']
const ATTACHMENTS = [
	{ name: 'System test link 1', url: 'https://example.com/system-test-1' },
	{ name: 'System test link 2', url: 'https://example.com/system-test-2' },
]

const ALL = { fetchAll: true, limit: 100 } as const

type Named = { gid: string; name?: string }

async function findOrCreate(existing: Named[], name: string, create: () => Promise<Named>): Promise<Named> {
	const found = existing.find((item) => item.name === name)
	if (found) return found
	const created = await create()
	existing.push({ gid: created.gid, name })
	return created
}

/**
 * Makes the project hold what the system and learning tests page over: two sections,
 * two tasks in the first, and on the first task two comments and two link attachments.
 * Looks each fixture up by name first, so a re-run creates nothing.
 */
export async function ensureSystemFixtures(context: FixtureContext, projectGid: string): Promise<SystemFixtures> {
	const project = await context.projects.getProject(projectGid, { optFields: 'name,workspace.gid' })
	const workspaceGid: string = project.workspace.gid

	const sections: Named[] = [...listItems<Named>(await context.sections.listSections(projectGid, ALL))]
	const sectionGids: string[] = []
	for (const name of SECTION_NAMES) {
		const section = await findOrCreate(sections, name, () => context.sections.createSection(projectGid, name))
		sectionGids.push(section.gid)
	}
	const sectionGid = sectionGids[0]!

	const tasks: Named[] = [...listItems<Named>(await context.tasks.listTasks(projectGid, ALL))]
	const taskGids: string[] = []
	for (const name of TASK_NAMES) {
		const task = await findOrCreate(tasks, name, () =>
			context.tasks.createTask(workspaceGid, name, {
				memberships: [{ project: projectGid, section: sectionGid }],
			}),
		)
		taskGids.push(task.gid)
	}

	const taskGid = taskGids[0]!
	const stories = listItems<{ text?: string }>(
		await context.stories.listStories(taskGid, { ...ALL, optFields: 'text,type' }),
	)
	for (const text of COMMENTS) {
		if (!stories.some((story) => story.text === text)) await context.stories.createStory(taskGid, { text })
	}
	const attachments = listItems<Named>(await context.attachments.listAttachments(taskGid, ALL))
	for (const { name, url } of ATTACHMENTS) {
		if (!attachments.some((attachment) => attachment.name === name)) {
			await context.attachments.createAttachment(taskGid, { name, url })
		}
	}

	return { workspaceGid, projectGid, sectionGid, taskGid, secondTaskGid: taskGids[1]! }
}

/**
 * The environment the fixtures answer to. `ASANA_WORKSPACE_GID` is the project's own
 * workspace, which may differ from the ambient `ASANA_WORKSPACE` of the person running.
 */
export function formatFixtureEnv(fixtures: SystemFixtures): string {
	return [
		`ASANA_WORKSPACE_GID=${fixtures.workspaceGid}`,
		`ASANA_SYSTEM_TEST_PROJECT_GID=${fixtures.projectGid}`,
		`ASANA_SYSTEM_TEST_SECTION_GID=${fixtures.sectionGid}`,
		`ASANA_SYSTEM_TEST_TASK_GID=${fixtures.taskGid}`,
		`ASANA_SYSTEM_TEST_SECOND_TASK_GID=${fixtures.secondTaskGid}`,
	].join('\n')
}
