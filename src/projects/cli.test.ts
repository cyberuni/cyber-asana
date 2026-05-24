import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const searchProjectsMock = vi.fn()
const getProjectTaskCountsMock = vi.fn()
const createProjectMock = vi.fn()
const updateProjectMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		searchProjects: searchProjectsMock,
		getProjectTaskCounts: getProjectTaskCountsMock,
		createProject: createProjectMock,
		updateProject: updateProjectMock,
	}
})

async function loadProjectCommand() {
	vi.resetModules()
	const mod = await import('./cli.js')
	return mod.projectCommand
}

describe('projects/cli', () => {
	const originalArgv = [...process.argv]
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('project search forwards text and filters to searchProjects', async () => {
		searchProjectsMock.mockResolvedValue([{ gid: '1', name: 'Launch Roadmap' }])
		const projectCommand = await loadProjectCommand()
		const program = new Command().addCommand(projectCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'project',
				'search',
				'launch',
				'--workspace-gid',
				'ws1',
				'--no-completed',
				'--team',
				't1,t2',
				'--owner',
				'me',
				'--member',
				'u1',
				'--member-not',
				'u2',
				'--portfolio',
				'p1',
				'--due-on-before',
				'2026-06-30',
				'--sort-by',
				'due_date',
				'--sort-asc',
				'--opt-fields',
				'gid,name,owner',
			],
			{ from: 'node' },
		)

		expect(searchProjectsMock).toHaveBeenCalledWith('ws1', {
			text: 'launch',
			completed: false,
			teamsAny: 't1,t2',
			ownerAny: 'me',
			membersAny: 'u1',
			membersNot: 'u2',
			portfoliosAny: 'p1',
			dueOnBefore: '2026-06-30',
			sortBy: 'due_date',
			sortAscending: true,
			optFields: 'gid,name,owner',
		})
	})

	it('project counts uses default count fields and prints readable output', async () => {
		getProjectTaskCountsMock.mockResolvedValue({
			num_tasks: 12,
			num_incomplete_tasks: 5,
			num_completed_tasks: 7,
		})
		const projectCommand = await loadProjectCommand()
		const program = new Command().addCommand(projectCommand())

		await program.parseAsync(['node', 'test', 'project', 'counts', '123'], { from: 'node' })

		expect(getProjectTaskCountsMock).toHaveBeenCalledWith('123', undefined)
		expect(logSpy.mock.calls.map(([line]) => line)).toEqual([
			'Project ID        123',
			'Total Tasks       12',
			'Incomplete Tasks  5',
			'Completed Tasks   7',
		])
	})

	it('project counts forwards custom optFields and prints returned fields', async () => {
		getProjectTaskCountsMock.mockResolvedValue({
			num_milestones: 3,
			num_tasks: 12,
		})
		const projectCommand = await loadProjectCommand()
		const program = new Command().addCommand(projectCommand())

		await program.parseAsync(['node', 'test', 'project', 'counts', '123', '--opt-fields', 'num_milestones,num_tasks'], {
			from: 'node',
		})

		expect(getProjectTaskCountsMock).toHaveBeenCalledWith('123', {
			optFields: 'num_milestones,num_tasks',
		})
		expect(logSpy.mock.calls.map(([line]) => line)).toEqual(['num_milestones  3', 'num_tasks       12'])
	})

	it('project counts prints raw json with --json', async () => {
		getProjectTaskCountsMock.mockResolvedValue({
			num_tasks: 12,
			num_incomplete_tasks: 5,
			num_completed_tasks: 7,
		})
		process.argv = ['node', 'test', '--json']
		const projectCommand = await loadProjectCommand()
		const program = new Command().option('--json').addCommand(projectCommand())

		await program.parseAsync(['node', 'test', '--json', 'project', 'counts', '123'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify(
				{
					num_tasks: 12,
					num_incomplete_tasks: 5,
					num_completed_tasks: 7,
				},
				null,
				2,
			),
		)
	})

	it('project create maps richer project write flags', async () => {
		createProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()
		const program = new Command().addCommand(projectCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'project',
				'create',
				'Launch',
				'--workspace-gid',
				'ws1',
				'--html-notes',
				'<body>Brief</body>',
				'--privacy-setting',
				'private',
				'--default-view',
				'board',
				'--due-on',
				'2026-06-10',
				'--start-on',
				'2026-06-01',
			],
			{ from: 'node' },
		)

		expect(createProjectMock).toHaveBeenCalledWith('ws1', 'Launch', {
			html_notes: '<body>Brief</body>',
			privacy_setting: 'private',
			default_view: 'board',
			due_on: '2026-06-10',
			start_on: '2026-06-01',
		})
	})

	it('project update maps clear start flag to start_on null', async () => {
		updateProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()
		const program = new Command().addCommand(projectCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'project',
				'update',
				'123',
				'--due-on',
				'2026-06-10',
				'--clear-start-on',
			],
			{ from: 'node' },
		)

		expect(updateProjectMock).toHaveBeenCalledWith('123', {
			due_on: '2026-06-10',
			start_on: null,
		})
	})
})
