import { describe, expect, it } from 'vitest'
import { ensureSystemFixtures, type FixtureContext, formatFixtureEnv } from './system-fixtures.js'

type Counts = { projects: number; sections: number; tasks: number; stories: number; attachments: number }

function createFakeContext(seed?: { sections?: string[]; projects?: string[] }) {
	let nextGid = 1000
	const gid = () => String(nextGid++)
	const created: Counts = { projects: 0, sections: 0, tasks: 0, stories: 0, attachments: 0 }
	const projects = (seed?.projects ?? []).map((name) => ({ gid: gid(), name }))
	const sections = (seed?.sections ?? ['Untitled section']).map((name) => ({ gid: gid(), name }))
	const tasks: Array<{ gid: string; name: string; section: string }> = []
	const stories: Array<{ gid: string; task: string; text: string; type: string }> = []
	const attachments: Array<{ gid: string; parent: string; name: string }> = []
	const page = <T>(data: T[]) => ({ data, next_page: null })

	const context: FixtureContext = {
		projects: {
			listProjects: async () => page(projects),
			createProject: async (_workspaceGid: string, name: string) => {
				created.projects++
				const project = { gid: gid(), name }
				projects.push(project)
				return project
			},
			getProject: async (projectGid: string) => ({
				gid: projectGid,
				name: 'fixture project',
				workspace: { gid: 'ws-1', name: 'workspace' },
			}),
		},
		sections: {
			listSections: async () => page(sections),
			createSection: async (_projectGid: string, name: string) => {
				created.sections++
				const section = { gid: gid(), name }
				sections.push(section)
				return section
			},
		},
		tasks: {
			listTasks: async () => page(tasks.map(({ gid, name }) => ({ gid, name }))),
			createTask: async (
				_workspaceGid: string,
				name: string,
				opts?: { memberships?: Array<{ project: string; section: string }> },
			) => {
				created.tasks++
				const task = { gid: gid(), name, section: opts?.memberships?.[0]?.section ?? '' }
				tasks.push(task)
				return task
			},
		},
		stories: {
			listStories: async (taskGid: string) =>
				page(stories.filter((s) => s.task === taskGid).map(({ gid, text, type }) => ({ gid, text, type }))),
			createStory: async (taskGid: string, fields: { text?: string }) => {
				created.stories++
				const story = { gid: gid(), task: taskGid, text: fields.text ?? '', type: 'comment' }
				stories.push(story)
				return story
			},
		},
		attachments: {
			listAttachments: async (parentGid: string) =>
				page(attachments.filter((a) => a.parent === parentGid).map(({ gid, name }) => ({ gid, name }))),
			createAttachment: async (parentGid: string, fields: { name?: string; url?: string }) => {
				created.attachments++
				const attachment = { gid: gid(), parent: parentGid, name: fields.name ?? '' }
				attachments.push(attachment)
				return attachment
			},
		},
	} as unknown as FixtureContext

	return { context, created, projects, sections, tasks, stories, attachments }
}

describe('ensureSystemFixtures', () => {
	it('creates two sections, two tasks, and the comments and attachments the list specs page over', async () => {
		const fake = createFakeContext()

		const fixtures = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fixtures.workspaceGid).toBe('ws-1')
		expect(fixtures.projectGid).toBe('project-1')
		expect(fake.sections.map((s) => s.name)).toEqual(['Untitled section', 'System test A', 'System test B'])
		expect(fake.tasks.map((t) => t.name)).toEqual(['System test task 1', 'System test task 2'])
		expect(fake.tasks.every((t) => t.section === fixtures.sectionGid)).toBe(true)
		expect(fixtures.sectionGid).toBe(fake.sections.find((s) => s.name === 'System test A')?.gid)
		expect(fixtures.taskGid).toBe(fake.tasks[0]?.gid)
		expect(fixtures.secondTaskGid).toBe(fake.tasks[1]?.gid)
		expect(fake.stories.filter((s) => s.task === fixtures.taskGid)).toHaveLength(2)
		expect(fake.attachments.filter((a) => a.parent === fixtures.taskGid)).toHaveLength(2)
	})

	it('creates nothing on a second run', async () => {
		const fake = createFakeContext()
		const first = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })
		const created = { ...fake.created }

		const second = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fake.created).toEqual(created)
		expect(second).toEqual(first)
	})

	it('reuses a section that already has a fixture name', async () => {
		const fake = createFakeContext({ sections: ['Untitled section', 'System test A'] })

		await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fake.created.sections).toBe(1)
	})
})

describe('ensureSystemFixtures given a workspace', () => {
	it('creates a cyber-asana prefixed project and fills it', async () => {
		const fake = createFakeContext()

		const fixtures = await ensureSystemFixtures(fake.context, { workspaceGid: 'ws-9' })

		expect(fake.projects.map((p) => p.name)).toEqual(['cyber-asana system test'])
		expect(fixtures.workspaceGid).toBe('ws-9')
		expect(fixtures.projectGid).toBe(fake.projects[0]?.gid)
		expect(fake.tasks).toHaveLength(2)
	})

	it('reuses the project on a second run and leaves other projects alone', async () => {
		const fake = createFakeContext({ projects: ['Unite Note'] })
		const first = await ensureSystemFixtures(fake.context, { workspaceGid: 'ws-9' })
		const created = { ...fake.created }

		const second = await ensureSystemFixtures(fake.context, { workspaceGid: 'ws-9' })

		expect(fake.projects.map((p) => p.name)).toEqual(['Unite Note', 'cyber-asana system test'])
		expect(fake.created).toEqual(created)
		expect(second).toEqual(first)
	})
})

describe('formatFixtureEnv', () => {
	it('names the workspace the project lives in, not the ambient one', () => {
		const lines = formatFixtureEnv({
			workspaceGid: 'ws-1',
			projectGid: 'p-1',
			sectionGid: 's-1',
			taskGid: 't-1',
			secondTaskGid: 't-2',
		}).split('\n')

		expect(lines).toEqual([
			'ASANA_WORKSPACE_GID=ws-1',
			'ASANA_SYSTEM_TEST_PROJECT_GID=p-1',
			'ASANA_SYSTEM_TEST_SECTION_GID=s-1',
			'ASANA_SYSTEM_TEST_TASK_GID=t-1',
			'ASANA_SYSTEM_TEST_SECOND_TASK_GID=t-2',
		])
	})
})
