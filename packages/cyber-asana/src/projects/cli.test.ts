import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const searchProjectsMock = vi.fn()
const getProjectTaskCountsMock = vi.fn()
const createProjectMock = vi.fn()
const updateProjectMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
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

	it('project list requests a minimal default field set, and respects an override', async () => {
		const listProjects = vi.fn().mockResolvedValue([])
		const projectCommand = await loadProjectCommand()
		const deps = {
			listProjects,
			getProject: vi.fn(),
			getProjectTaskCounts: vi.fn(),
			createProject: vi.fn(),
			updateProject: vi.fn(),
			deleteProject: vi.fn(),
			searchProjects: vi.fn(),
			exportProject: vi.fn(),
		}

		await new Command()
			.addCommand(projectCommand(deps))
			.parseAsync(['node', 'test', 'project', 'list', '--workspace-gid', 'ws1'], { from: 'node' })
		expect(listProjects).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'gid,name' }))

		await new Command()
			.addCommand(projectCommand(deps))
			.parseAsync(['node', 'test', 'project', 'list', '--workspace-gid', 'ws1', '--opt-fields', 'name,notes'], {
				from: 'node',
			})
		expect(listProjects).toHaveBeenLastCalledWith('ws1', expect.objectContaining({ optFields: 'name,notes' }))
	})

	it('project list prints a count summary and next-step suggestions', async () => {
		const projectCommand = await loadProjectCommand()
		const program = new Command().addCommand(
			projectCommand({
				listProjects: vi.fn().mockResolvedValue([
					{ gid: '1', name: 'A' },
					{ gid: '2', name: 'B' },
				]),
				getProject: vi.fn(),
				getProjectTaskCounts: vi.fn(),
				createProject: vi.fn(),
				updateProject: vi.fn(),
				deleteProject: vi.fn(),
				searchProjects: vi.fn(),
				exportProject: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'project', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n2 project(s)')
		expect(lines).toContain('\nNext steps:')
		expect(lines.some((l) => l.includes('cyber-asana project get <gid>'))).toBe(true)
	})

	it('project get truncates long notes by default and shows them all with --full', async () => {
		const projectCommand = await loadProjectCommand()
		const deps = {
			listProjects: vi.fn(),
			getProject: vi.fn().mockResolvedValue({ gid: 'p1', name: 'Launch', notes: 'x'.repeat(600) }),
			getProjectTaskCounts: vi.fn(),
			createProject: vi.fn(),
			updateProject: vi.fn(),
			deleteProject: vi.fn(),
			searchProjects: vi.fn(),
			exportProject: vi.fn(),
		}

		await new Command()
			.addCommand(projectCommand(deps))
			.parseAsync(['node', 'test', 'project', 'get', 'p1'], { from: 'node' })
		const truncated = logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('Notes'))
		expect(truncated).toContain('[truncated, 600 chars total; use --full for the rest]')

		logSpy.mockClear()
		process.argv = ['node', 'test', '--full']
		await new Command()
			.option('--full')
			.addCommand(projectCommand(deps))
			.parseAsync(['node', 'test', '--full', 'project', 'get', 'p1'], { from: 'node' })
		const full = logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('Notes'))
		expect(full).not.toContain('[truncated')
		expect(full).toContain('x'.repeat(600))
	})

	it('project --help carries usage examples covering its subcommands', async () => {
		const projectCommand = await loadProjectCommand()
		let help = ''
		const cmd = projectCommand()
		cmd.configureOutput({ writeOut: (s) => (help += s) })
		cmd.outputHelp()

		expect(help).toContain('Examples:')
		expect(help).toContain('cyber-asana project list --workspace-gid <gid>')
		expect(help).toContain('cyber-asana project create "New project"')
		expect(help).toContain('Every subcommand supports --help for its own options.')
	})

	it('project delete emits a structured acknowledgement with --json', async () => {
		const projectCommand = await loadProjectCommand()
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(
			projectCommand({
				listProjects: vi.fn(),
				getProject: vi.fn(),
				getProjectTaskCounts: vi.fn(),
				createProject: vi.fn(),
				updateProject: vi.fn(),
				deleteProject: vi.fn().mockResolvedValue(undefined),
				searchProjects: vi.fn(),
				exportProject: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', '--json', 'project', 'delete', 'p1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'project', gid: 'p1', already_absent: false }, null, 2),
		)
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
			['node', 'test', 'project', 'update', '123', '--due-on', '2026-06-10', '--clear-start-on'],
			{ from: 'node' },
		)

		expect(updateProjectMock).toHaveBeenCalledWith('123', {
			due_on: '2026-06-10',
			start_on: null,
		})
	})

	it('project command can use injected dependencies', async () => {
		const injectedCreateProject = vi.fn().mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()
		const program = new Command().addCommand(
			projectCommand({
				listProjects: vi.fn(),
				getProject: vi.fn(),
				getProjectTaskCounts: vi.fn(),
				createProject: injectedCreateProject,
				updateProject: vi.fn(),
				deleteProject: vi.fn(),
				searchProjects: vi.fn(),
				exportProject: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'project', 'create', 'Launch', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(injectedCreateProject).toHaveBeenCalledWith('ws1', 'Launch', {})
	})

	it('project list forwards --archived and --no-archived as the archived filter', async () => {
		const listProjects = vi.fn().mockResolvedValue([])
		const projectCommand = await loadProjectCommand()
		const deps = {
			listProjects,
			getProject: vi.fn(),
			getProjectTaskCounts: vi.fn(),
			createProject: vi.fn(),
			updateProject: vi.fn(),
			deleteProject: vi.fn(),
			searchProjects: vi.fn(),
			exportProject: vi.fn(),
		}

		await new Command()
			.addCommand(projectCommand(deps))
			.parseAsync(['node', 'test', 'project', 'list', '--workspace-gid', 'ws1', '--archived'], { from: 'node' })
		expect(listProjects).toHaveBeenLastCalledWith('ws1', expect.objectContaining({ archived: true }))

		await new Command()
			.addCommand(projectCommand(deps))
			.parseAsync(['node', 'test', 'project', 'list', '--workspace-gid', 'ws1', '--no-archived'], { from: 'node' })
		expect(listProjects).toHaveBeenLastCalledWith('ws1', expect.objectContaining({ archived: false }))
	})

	it('project list leaves the archived filter unset when neither flag is given', async () => {
		const listProjects = vi.fn().mockResolvedValue([])
		const projectCommand = await loadProjectCommand()

		await new Command()
			.addCommand(
				projectCommand({
					listProjects,
					getProject: vi.fn(),
					getProjectTaskCounts: vi.fn(),
					createProject: vi.fn(),
					updateProject: vi.fn(),
					deleteProject: vi.fn(),
					searchProjects: vi.fn(),
					exportProject: vi.fn(),
				}),
			)
			.parseAsync(['node', 'test', 'project', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listProjects.mock.calls[0]?.[1]).not.toHaveProperty('archived')
	})

	it('project list forwards --custom-type', async () => {
		const listProjects = vi.fn().mockResolvedValue([])
		const projectCommand = await loadProjectCommand()

		await new Command()
			.addCommand(
				projectCommand({
					listProjects,
					getProject: vi.fn(),
					getProjectTaskCounts: vi.fn(),
					createProject: vi.fn(),
					updateProject: vi.fn(),
					deleteProject: vi.fn(),
					searchProjects: vi.fn(),
					exportProject: vi.fn(),
				}),
			)
			.parseAsync(['node', 'test', 'project', 'list', '--workspace-gid', 'ws1', '--custom-type', 'ct1'], {
				from: 'node',
			})

		expect(listProjects).toHaveBeenCalledWith('ws1', expect.objectContaining({ customType: 'ct1' }))
	})

	it('project update archives and unarchives a project', async () => {
		updateProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'update', '123', '--archived'], { from: 'node' })
		expect(updateProjectMock).toHaveBeenLastCalledWith('123', { archived: true })

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'update', '123', '--no-archived'], { from: 'node' })
		expect(updateProjectMock).toHaveBeenLastCalledWith('123', { archived: false })

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'update', '123', '--name', 'Renamed'], { from: 'node' })
		expect(updateProjectMock.mock.calls.at(-1)?.[1]).not.toHaveProperty('archived')
	})

	it('project create carries the archived flag', async () => {
		createProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'create', 'Launch', '--workspace-gid', 'ws1', '--archived'], {
				from: 'node',
			})

		expect(createProjectMock).toHaveBeenCalledWith('ws1', 'Launch', { archived: true })
	})

	it('project create and update carry the owner', async () => {
		createProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		updateProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'create', 'Launch', '--workspace-gid', 'ws1', '--owner', 'me'], {
				from: 'node',
			})
		expect(createProjectMock).toHaveBeenCalledWith('ws1', 'Launch', { owner: 'me' })

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'update', '123', '--owner', '12345'], { from: 'node' })
		expect(updateProjectMock).toHaveBeenLastCalledWith('123', { owner: '12345' })
	})

	it('project update maps clear owner to owner null', async () => {
		updateProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'update', '123', '--clear-owner'], { from: 'node' })

		expect(updateProjectMock).toHaveBeenLastCalledWith('123', { owner: null })
	})

	it('project create and update carry the default access level', async () => {
		createProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		updateProjectMock.mockResolvedValue({ gid: '1', name: 'Launch' })
		const projectCommand = await loadProjectCommand()

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(
				['node', 'test', 'project', 'create', 'Launch', '--workspace-gid', 'ws1', '--default-access-level', 'editor'],
				{ from: 'node' },
			)
		expect(createProjectMock).toHaveBeenCalledWith('ws1', 'Launch', { default_access_level: 'editor' })

		await new Command()
			.addCommand(projectCommand())
			.parseAsync(['node', 'test', 'project', 'update', '123', '--default-access-level', 'viewer'], { from: 'node' })
		expect(updateProjectMock).toHaveBeenLastCalledWith('123', { default_access_level: 'viewer' })
	})
})
