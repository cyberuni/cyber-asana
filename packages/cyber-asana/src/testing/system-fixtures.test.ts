import { describe, expect, it } from 'vitest'
import { ensureSystemFixtures, type FixtureContext, formatFixtureEnv } from './system-fixtures.js'

type Counts = { goals: number; projects: number; sections: number; tasks: number; stories: number; attachments: number }

function createFakeContext(seed?: {
	sections?: string[]
	projects?: string[]
	team?: string
	goals?: string[]
	goalsPaymentRequired?: boolean
	tables?: string[]
	tablesPaymentRequired?: boolean
}) {
	let nextGid = 1000
	const gid = () => String(nextGid++)
	const created: Counts = { goals: 0, projects: 0, sections: 0, tasks: 0, stories: 0, attachments: 0 }
	const projects = (seed?.projects ?? []).map((name) => ({ gid: gid(), name }))
	const sections = (seed?.sections ?? ['Untitled section']).map((name) => ({ gid: gid(), name }))
	const tasks: Array<{ gid: string; name: string; section: string }> = []
	const stories: Array<{ gid: string; task: string; text: string; type: string }> = []
	const attachments: Array<{ gid: string; parent: string; name: string }> = []
	const goals = (seed?.goals ?? []).map((name) => ({ gid: gid(), name }))
	const tables = (seed?.tables ?? []).map((name) => ({ gid: gid(), name }))
	const records: Array<{ gid: string; table: string; name: string }> = []
	const recordStories: Array<{ gid: string; record: string; text: string }> = []
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
				...(seed?.team ? { team: { gid: seed.team, name: 'team' } } : {}),
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
		goals: {
			listGoals: async () => page(goals),
			listTimePeriods: async () => page([{ gid: 'tp-1' }]),
			createGoal: async (_workspaceGid: string, name: string, opts?: { time_period?: string }) => {
				if (seed?.goalsPaymentRequired) throw Object.assign(new Error('Payment Required'), { status: 402 })
				if (!opts?.time_period) throw new Error('Bad Request')
				created.goals++
				const goal = { gid: gid(), name }
				goals.push(goal)
				return goal
			},
		},
		tables: {
			listTables: async () => {
				if (seed?.tablesPaymentRequired) throw Object.assign(new Error('Payment Required'), { status: 402 })
				return page(tables)
			},
			createTable: async (_workspaceGid: string, name: string) => {
				const table = { gid: gid(), name }
				tables.push(table)
				return table
			},
		},
		records: {
			listRecords: async (tableGid: string) =>
				page(records.filter((r) => r.table === tableGid).map(({ gid, name }) => ({ gid, name }))),
			createRecord: async (tableGid: string, name: string) => {
				const record = { gid: gid(), table: tableGid, name }
				records.push(record)
				return record
			},
			listRecordStories: async (recordGid: string) =>
				page(recordStories.filter((s) => s.record === recordGid).map(({ gid, text }) => ({ gid, text }))),
			createRecordStory: async (recordGid: string, fields: { text?: string }) => {
				const story = { gid: gid(), record: recordGid, text: fields.text ?? '' }
				recordStories.push(story)
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

	return { context, created, tables, records, recordStories, goals, projects, sections, tasks, stories, attachments }
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

describe('ensureSystemFixtures team', () => {
	it("takes the project's team as the team GID", async () => {
		const fake = createFakeContext({ team: 'team-7' })

		const fixtures = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fixtures.teamGid).toBe('team-7')
	})

	it('leaves the team GID unset for a project in a workspace without teams', async () => {
		const fixtures = await ensureSystemFixtures(createFakeContext().context, { projectGid: 'project-1' })

		expect(fixtures.teamGid).toBeUndefined()
	})
})

describe('ensureSystemFixtures goal', () => {
	it('creates a cyber-asana system test goal in a time period and reports its GID', async () => {
		const fake = createFakeContext()

		const fixtures = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fake.goals.map((g) => g.name)).toEqual(['cyber-asana system test'])
		expect(fixtures.goalGid).toBe(fake.goals[0]?.gid)
	})

	it('reuses the goal on a second run and leaves other goals alone', async () => {
		const fake = createFakeContext({ goals: ['Someone else'] })
		const first = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		const second = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fake.created.goals).toBe(1)
		expect(fake.goals.map((g) => g.name)).toEqual(['Someone else', 'cyber-asana system test'])
		expect(second).toEqual(first)
	})

	it('leaves the goal GID unset where Asana answers Payment Required', async () => {
		const fixtures = await ensureSystemFixtures(createFakeContext({ goalsPaymentRequired: true }).context, {
			projectGid: 'project-1',
		})

		expect(fixtures.goalGid).toBeUndefined()
	})
})

describe('ensureSystemFixtures table and records', () => {
	it('creates a table with two records and two stories on the first, and reports their GIDs', async () => {
		const fake = createFakeContext()

		const fixtures = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fake.tables.map((t) => t.name)).toEqual(['cyber-asana system test'])
		expect(fixtures.tableGid).toBe(fake.tables[0]?.gid)
		expect(fake.records.map((r) => r.name)).toEqual(['System test record 1', 'System test record 2'])
		expect(fixtures.recordGid).toBe(fake.records[0]?.gid)
		expect(fake.recordStories.map((s) => s.record)).toEqual([fixtures.recordGid, fixtures.recordGid])
	})

	it('creates nothing on a second run', async () => {
		const fake = createFakeContext({ tables: ['Someone else'] })
		const first = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		const second = await ensureSystemFixtures(fake.context, { projectGid: 'project-1' })

		expect(fake.tables).toHaveLength(2)
		expect(fake.records).toHaveLength(2)
		expect(fake.recordStories).toHaveLength(2)
		expect(second).toEqual(first)
	})

	it('leaves the table and record GIDs unset where Asana answers Payment Required', async () => {
		const fixtures = await ensureSystemFixtures(createFakeContext({ tablesPaymentRequired: true }).context, {
			projectGid: 'project-1',
		})

		expect(fixtures.tableGid).toBeUndefined()
		expect(fixtures.recordGid).toBeUndefined()
	})
})

describe('formatFixtureEnv', () => {
	it('adds the goal line when there is a goal', () => {
		const lines = formatFixtureEnv({
			workspaceGid: 'ws-1',
			projectGid: 'p-1',
			sectionGid: 's-1',
			taskGid: 't-1',
			secondTaskGid: 't-2',
			goalGid: 'g-1',
		}).split('\n')

		expect(lines.at(-1)).toBe('ASANA_SYSTEM_TEST_GOAL_GID=g-1')
	})

	it('adds the table and record lines when there are any', () => {
		const lines = formatFixtureEnv({
			workspaceGid: 'ws-1',
			projectGid: 'p-1',
			sectionGid: 's-1',
			taskGid: 't-1',
			secondTaskGid: 't-2',
			tableGid: 'tb-1',
			recordGid: 'r-1',
		}).split('\n')

		expect(lines.slice(-2)).toEqual(['ASANA_SYSTEM_TEST_TABLE_GID=tb-1', 'ASANA_SYSTEM_TEST_RECORD_GID=r-1'])
	})

	it('adds the team line when there is a team', () => {
		const lines = formatFixtureEnv({
			workspaceGid: 'ws-1',
			projectGid: 'p-1',
			sectionGid: 's-1',
			taskGid: 't-1',
			secondTaskGid: 't-2',
			teamGid: 'team-7',
		}).split('\n')

		expect(lines.at(-1)).toBe('ASANA_SYSTEM_TEST_TEAM_GID=team-7')
	})

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
