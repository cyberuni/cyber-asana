import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createTaskMock = vi.fn()
const updateTaskMock = vi.fn()
const addFollowersToTaskMock = vi.fn()
const removeFollowersFromTaskMock = vi.fn()
const getTasksByGidMock = vi.fn()
const getTaskMock = vi.fn()
const listTasksMock = vi.fn()
const getMyTasksMock = vi.fn()
const listSubtasksMock = vi.fn()
const createSubtaskMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createTask: createTaskMock,
		updateTask: updateTaskMock,
		addFollowersToTask: addFollowersToTaskMock,
		removeFollowersFromTask: removeFollowersFromTaskMock,
		getTasksByGid: getTasksByGidMock,
		getTask: getTaskMock,
		listTasks: listTasksMock,
		getMyTasks: getMyTasksMock,
		listSubtasks: listSubtasksMock,
		createSubtask: createSubtaskMock,
	}
})

const { taskCommand } = await import('./cli.js')

describe('tasks/cli', () => {
	const originalArgv = [...process.argv]
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	// Mutation acknowledgements must honor --json/--toon like every other command.
	describe.each([
		{
			name: 'task delete',
			argv: ['task', 'delete', 't1'],
			method: 'deleteTask',
			payload: { deleted: true, resource: 'task', gid: 't1', already_absent: false },
		},
		{
			name: 'task project add',
			argv: ['task', 'project', 'add', 't1', 'p1'],
			method: 'addTaskToProject',
			payload: { task: 't1', project: 'p1', status: 'added' },
		},
		{
			name: 'task project remove',
			argv: ['task', 'project', 'remove', 't1', 'p1'],
			method: 'removeTaskFromProject',
			payload: { task: 't1', project: 'p1', status: 'removed' },
		},
		{
			name: 'task follower add',
			argv: ['task', 'follower', 'add', 't1', 'u1', 'u2'],
			method: 'addFollowersToTask',
			payload: { task: 't1', followers: ['u1', 'u2'], status: 'added' },
		},
		{
			name: 'task follower remove',
			argv: ['task', 'follower', 'remove', 't1', 'u1'],
			method: 'removeFollowersFromTask',
			payload: { task: 't1', followers: ['u1'], status: 'removed' },
		},
		{
			name: 'task dependency add',
			argv: ['task', 'dependency', 'add', 't1', 'd1'],
			method: 'addDependencies',
			payload: { task: 't1', dependencies: ['d1'], status: 'added' },
		},
		{
			name: 'task dependency remove',
			argv: ['task', 'dependency', 'remove', 't1', 'd1'],
			method: 'removeDependencies',
			payload: { task: 't1', dependencies: ['d1'], status: 'removed' },
		},
		{
			name: 'task dependent add',
			argv: ['task', 'dependent', 'add', 't1', 'd1'],
			method: 'addDependents',
			payload: { task: 't1', dependents: ['d1'], status: 'added' },
		},
		{
			name: 'task dependent remove',
			argv: ['task', 'dependent', 'remove', 't1', 'd1'],
			method: 'removeDependents',
			payload: { task: 't1', dependents: ['d1'], status: 'removed' },
		},
	])('$name', ({ argv, method, payload }) => {
		it('emits a structured acknowledgement with --json', async () => {
			process.argv = ['node', 'test', '--json']
			const api = { [method]: vi.fn().mockResolvedValue(undefined) } as never
			const program = new Command().option('--json').addCommand(taskCommand(api))

			await program.parseAsync(['node', 'test', '--json', ...argv], { from: 'node' })

			expect(logSpy).toHaveBeenCalledWith(JSON.stringify(payload, null, 2))
		})
	})

	it('task create normalizes multi-project, followers, html notes, and custom fields', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'task',
				'create',
				'Task',
				'--workspace-gid',
				'ws1',
				'--project',
				'111,222',
				'--follower',
				'u1,u2',
				'--html-notes',
				'<body>Hi</body>',
				'--parent',
				'parent1',
				'--resource-subtype',
				'milestone',
				'--custom-fields-json',
				'{"cf1":"json"}',
				'--custom-field',
				'cf2=value',
			],
			{ from: 'node' },
		)

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', {
			html_notes: '<body>Hi</body>',
			projects: ['111', '222'],
			followers: ['u1', 'u2'],
			parent: 'parent1',
			resource_subtype: 'milestone',
			custom_fields: { cf1: 'json', cf2: 'value' },
		})
	})

	it('task update normalizes html notes, parent, and custom fields', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'task',
				'update',
				'123',
				'--html-notes',
				'<body>Updated</body>',
				'--parent',
				'parent1',
				'--resource-subtype',
				'milestone',
				'--custom-field',
				'cf2=value',
			],
			{ from: 'node' },
		)

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			html_notes: '<body>Updated</body>',
			parent: 'parent1',
			resource_subtype: 'milestone',
			custom_fields: { cf2: 'value' },
		})
	})

	it('task update maps clear due flag to due_on null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'update', '123', '--clear-due-on'], { from: 'node' })

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			due_on: null,
		})
	})

	it('task create sets start_on alongside due_on', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'task',
				'create',
				'Task',
				'--workspace-gid',
				'ws1',
				'--start-on',
				'2026-09-01',
				'--due-on',
				'2026-10-31',
			],
			{ from: 'node' },
		)

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', {
			start_on: '2026-09-01',
			due_on: '2026-10-31',
		})
	})

	it('task create sets due_at and start_at', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'task',
				'create',
				'Task',
				'--workspace-gid',
				'ws1',
				'--start-at',
				'2026-09-01T09:00:00.000Z',
				'--due-at',
				'2026-10-31T17:00:00.000Z',
			],
			{ from: 'node' },
		)

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', {
			start_at: '2026-09-01T09:00:00.000Z',
			due_at: '2026-10-31T17:00:00.000Z',
		})
	})

	it('task update maps the clear date-time flags to null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'update', '123', '--clear-due-at', '--clear-start-at'], {
			from: 'node',
		})

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			due_at: null,
			start_at: null,
		})
	})

	it('task update maps clear assignee flag to assignee null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'update', '123', '--clear-assignee'], { from: 'node' })

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			assignee: null,
		})
	})

	it('task create marks the new task complete', async () => {
		createTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'ws1', '--completed'], {
			from: 'node',
		})

		expect(createTaskMock).toHaveBeenCalledWith('ws1', 'Task', { completed: true })
	})

	it('task subtask create forwards the same write fields as task create', async () => {
		createSubtaskMock.mockResolvedValue({ gid: '2', name: 'Sub Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'task',
				'subtask',
				'create',
				'123',
				'Sub Task',
				'--html-notes',
				'<body>Sub</body>',
				'--start-on',
				'2026-05-01',
				'--due-on',
				'2026-06-01',
				'--resource-subtype',
				'milestone',
				'--custom-field',
				'cf1=value',
				'--follower',
				'u1',
			],
			{ from: 'node' },
		)

		expect(createSubtaskMock).toHaveBeenCalledWith('123', 'Sub Task', {
			html_notes: '<body>Sub</body>',
			start_on: '2026-05-01',
			due_on: '2026-06-01',
			resource_subtype: 'milestone',
			custom_fields: { cf1: 'value' },
			followers: ['u1'],
		})
	})

	it('task update sets start_on alongside due_on', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			['node', 'test', 'task', 'update', '123', '--start-on', '2026-09-01', '--due-on', '2026-10-31'],
			{ from: 'node' },
		)

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			start_on: '2026-09-01',
			due_on: '2026-10-31',
		})
	})

	it('task update maps clear start flag to start_on null', async () => {
		updateTaskMock.mockResolvedValue({ gid: '1', name: 'Task' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'update', '123', '--clear-start-on'], { from: 'node' })

		expect(updateTaskMock).toHaveBeenCalledWith('123', {
			start_on: null,
		})
	})

	it('task follower add calls follower API helper', async () => {
		addFollowersToTaskMock.mockResolvedValue({ gid: '1' })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'follower', 'add', '123', 'u1', 'u2'], { from: 'node' })

		expect(addFollowersToTaskMock).toHaveBeenCalledWith('123', ['u1', 'u2'])
	})

	it('task get-many forwards gids and opt-fields to batch lookup', async () => {
		getTasksByGidMock.mockResolvedValue([{ gid: '123', ok: true, task: { gid: '123', name: 'Task 1' } }])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'get-many', '123', '456', '--opt-fields', 'gid,name,completed'], {
			from: 'node',
		})

		expect(getTasksByGidMock).toHaveBeenCalledWith(['123', '456'], {
			optFields: 'gid,name,completed',
		})
	})

	it('task get-many prints raw json with --json', async () => {
		getTasksByGidMock.mockResolvedValue([{ gid: '123', ok: true, task: { gid: '123', name: 'Task 1' } }])
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(taskCommand())

		await program.parseAsync(['node', 'test', '--json', 'task', 'get-many', '123'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify([{ gid: '123', ok: true, task: { gid: '123', name: 'Task 1' } }], null, 2),
		)
	})

	it('task list requests a minimal default field set when none is given', async () => {
		listTasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'list', '--project-gid', 'p1'], { from: 'node' })

		expect(listTasksMock).toHaveBeenCalledWith(
			'p1',
			expect.objectContaining({ optFields: 'gid,name,completed,due_on' }),
		)
	})

	it('task list respects an explicit --opt-fields override', async () => {
		listTasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'list', '--project-gid', 'p1', '--opt-fields', 'name,notes'], {
			from: 'node',
		})

		expect(listTasksMock).toHaveBeenCalledWith('p1', expect.objectContaining({ optFields: 'name,notes' }))
	})

	it('task my-tasks list requests a minimal default field set when none is given', async () => {
		getMyTasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'my-tasks', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(getMyTasksMock).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ optFields: 'gid,name,completed,due_on' }),
		)
	})

	it('task my-tasks list respects an explicit --opt-fields override', async () => {
		getMyTasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			['node', 'test', 'task', 'my-tasks', 'list', '--workspace-gid', 'ws1', '--opt-fields', 'name,notes'],
			{ from: 'node' },
		)

		expect(getMyTasksMock).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'name,notes' }))
	})

	it('task subtask list requests a minimal default field set when none is given', async () => {
		listSubtasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'subtask', 'list', '123'], { from: 'node' })

		expect(listSubtasksMock).toHaveBeenCalledWith(
			'123',
			expect.objectContaining({ optFields: 'gid,name,completed,due_on' }),
		)
	})

	it('task subtask list adds include-flag fields to the default field set', async () => {
		listSubtasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'subtask', 'list', '123', '--assignee-email'], { from: 'node' })

		expect(listSubtasksMock).toHaveBeenCalledWith(
			'123',
			expect.objectContaining({ optFields: 'gid,name,completed,due_on,assignee,assignee.email' }),
		)
	})

	it('task subtask list composes include flags with an explicit --opt-fields override', async () => {
		listSubtasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			['node', 'test', 'task', 'subtask', 'list', '123', '--opt-fields', 'gid,name', '--num-subtasks'],
			{ from: 'node' },
		)

		expect(listSubtasksMock).toHaveBeenCalledWith(
			'123',
			expect.objectContaining({ optFields: 'gid,name,num_subtasks' }),
		)
	})

	it('task subtask list does not repeat a field named by both the default and an include flag', async () => {
		listSubtasksMock.mockResolvedValue([])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(
			['node', 'test', 'task', 'subtask', 'list', '123', '--opt-fields', 'gid,assignee', '--assignee-email'],
			{ from: 'node' },
		)

		expect(listSubtasksMock).toHaveBeenCalledWith(
			'123',
			expect.objectContaining({ optFields: 'gid,assignee,assignee.email' }),
		)
	})

	it('task list prints an aggregate summary and next-step suggestions', async () => {
		listTasksMock.mockResolvedValue([
			{ gid: '1', name: 'A', completed: false },
			{ gid: '2', name: 'B', completed: true },
		])
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'list', '--project-gid', 'p1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n2 task(s): 1 incomplete, 1 done')
		expect(lines).toContain('\nNext steps:')
		expect(lines.some((l) => l.includes('cyber-asana task get <gid>'))).toBe(true)
	})

	it('task get truncates long notes with a size hint by default', async () => {
		getTaskMock.mockResolvedValue({ gid: '1', name: 'Task', notes: 'x'.repeat(600) })
		const program = new Command().addCommand(taskCommand())

		await program.parseAsync(['node', 'test', 'task', 'get', '1'], { from: 'node' })

		const notesLine = logSpy.mock.calls.map((c) => String(c[0])).find((line) => line.startsWith('Notes'))
		expect(notesLine).toContain('[truncated, 600 chars total; use --full for the rest]')
	})

	it('task get shows full notes with --full', async () => {
		getTaskMock.mockResolvedValue({ gid: '1', name: 'Task', notes: 'x'.repeat(600) })
		process.argv = ['node', 'test', '--full']
		const program = new Command().option('--full').addCommand(taskCommand())

		await program.parseAsync(['node', 'test', '--full', 'task', 'get', '1'], { from: 'node' })

		const notesLine = logSpy.mock.calls.map((c) => String(c[0])).find((line) => line.startsWith('Notes'))
		expect(notesLine).not.toContain('[truncated')
		expect(notesLine).toContain('x'.repeat(600))
	})

	it('task --help includes a concise examples reference', () => {
		let help = ''
		const cmd = taskCommand()
		cmd.configureOutput({ writeOut: (s) => (help += s) })
		cmd.outputHelp()
		expect(help).toContain('Examples:')
		expect(help).toContain('cyber-asana task list')
	})

	it('task command can use injected dependencies', async () => {
		const injectedCreateTask = vi.fn().mockResolvedValue({ gid: '1', name: 'New Task' })
		const program = new Command().addCommand(
			taskCommand({
				listTasks: vi.fn(),
				listTasksForSection: vi.fn(),
				getTask: vi.fn(),
				getTasksByGid: vi.fn(),
				createTask: injectedCreateTask,
				updateTask: vi.fn(),
				deleteTask: vi.fn(),
				getMyTasks: vi.fn(),
				listSubtasks: vi.fn(),
				createSubtask: vi.fn(),
				addTaskToProject: vi.fn(),
				removeTaskFromProject: vi.fn(),
				addFollowersToTask: vi.fn(),
				removeFollowersFromTask: vi.fn(),
				getDependencies: vi.fn(),
				getDependents: vi.fn(),
				addDependencies: vi.fn(),
				addDependents: vi.fn(),
				removeDependencies: vi.fn(),
				removeDependents: vi.fn(),
				searchTasks: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'task', 'create', 'New Task', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(injectedCreateTask).toHaveBeenCalledWith('ws1', 'New Task', {})
	})

	describe('--assignee resolves through the repo user registry', () => {
		let dir: string
		const previousConfig = process.env.CYBER_ASANA_CONFIG

		async function useRegistry() {
			dir = await mkdtemp(join(tmpdir(), 'cyber-asana-task-assignee-'))
			const path = join(dir, 'config.json')
			await writeFile(
				path,
				JSON.stringify({
					schema_version: 1,
					projects: [],
					users: [{ gid: '100', name: 'Alice Anderson', email: 'alice@example.com', aliases: ['ali'] }],
				}),
			)
			process.env.CYBER_ASANA_CONFIG = path
		}

		afterEach(async () => {
			if (previousConfig === undefined) delete process.env.CYBER_ASANA_CONFIG
			else process.env.CYBER_ASANA_CONFIG = previousConfig
			if (dir) await rm(dir, { recursive: true, force: true })
		})

		it('task create --assignee <alias> sends the registered GID', async () => {
			await useRegistry()
			createTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(
				['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'w1', '--assignee', 'ali'],
				{
					from: 'node',
				},
			)

			expect(createTaskMock).toHaveBeenCalledWith('w1', 'Task', expect.objectContaining({ assignee: '100' }))
		})

		it('task update --assignee <email> sends the registered GID', async () => {
			await useRegistry()
			updateTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(['node', 'test', 'task', 'update', 't1', '--assignee', 'alice@example.com'], {
				from: 'node',
			})

			expect(updateTaskMock).toHaveBeenCalledWith('t1', expect.objectContaining({ assignee: '100' }))
		})

		it('task subtask create --assignee <name> sends the registered GID', async () => {
			await useRegistry()
			createSubtaskMock.mockResolvedValue({ gid: 't2', name: 'Sub' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(
				['node', 'test', 'task', 'subtask', 'create', 't1', 'Sub', '--assignee', 'alice anderson'],
				{
					from: 'node',
				},
			)

			expect(createSubtaskMock).toHaveBeenCalledWith('t1', 'Sub', expect.objectContaining({ assignee: '100' }))
		})

		it('task create --assignee <unknown> fails before calling Asana', async () => {
			await useRegistry()
			const program = new Command().addCommand(taskCommand())

			await expect(
				program.parseAsync(['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'w1', '--assignee', 'carol'], {
					from: 'node',
				}),
			).rejects.toThrow(/config add-user/)
			expect(createTaskMock).not.toHaveBeenCalled()
		})

		it('task create --assignee <alias> falls back to the global registry when the repo config has no match', async () => {
			await useRegistry()
			const globalDir = await mkdtemp(join(tmpdir(), 'cyber-asana-task-assignee-global-'))
			const globalPath = join(globalDir, 'global.json')
			await writeFile(
				globalPath,
				JSON.stringify({
					schema_version: 1,
					repos: [],
					users: [{ gid: '200', name: 'Bob Brown', aliases: ['bobby'] }],
				}),
			)
			const previousGlobal = process.env.CYBER_ASANA_GLOBAL_CONFIG
			process.env.CYBER_ASANA_GLOBAL_CONFIG = globalPath
			createTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			try {
				await program.parseAsync(
					['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'w1', '--assignee', 'bobby'],
					{ from: 'node' },
				)
				expect(createTaskMock).toHaveBeenCalledWith('w1', 'Task', expect.objectContaining({ assignee: '200' }))
			} finally {
				if (previousGlobal === undefined) delete process.env.CYBER_ASANA_GLOBAL_CONFIG
				else process.env.CYBER_ASANA_GLOBAL_CONFIG = previousGlobal
				await rm(globalDir, { recursive: true, force: true })
			}
		})
	})
	describe('task create falls back to the repo config', () => {
		let dir: string
		const previousConfig = process.env.CYBER_ASANA_CONFIG

		const previousWorkspace = process.env.ASANA_WORKSPACE
		const previousWorkspaceGid = process.env.ASANA_WORKSPACE_GID

		async function useConfig(config: unknown) {
			delete process.env.ASANA_WORKSPACE
			delete process.env.ASANA_WORKSPACE_GID
			dir = await mkdtemp(join(tmpdir(), 'cyber-asana-task-defaults-'))
			const path = join(dir, 'config.json')
			await writeFile(path, JSON.stringify(config))
			process.env.CYBER_ASANA_CONFIG = path
		}

		afterEach(async () => {
			if (previousConfig === undefined) delete process.env.CYBER_ASANA_CONFIG
			else process.env.CYBER_ASANA_CONFIG = previousConfig
			if (previousWorkspace === undefined) delete process.env.ASANA_WORKSPACE
			else process.env.ASANA_WORKSPACE = previousWorkspace
			if (previousWorkspaceGid === undefined) delete process.env.ASANA_WORKSPACE_GID
			else process.env.ASANA_WORKSPACE_GID = previousWorkspaceGid
			if (dir) await rm(dir, { recursive: true, force: true })
		})

		it('uses the project marked default when --project is not given', async () => {
			await useConfig({
				schema_version: 2,
				projects: [{ gid: 'p9', name: 'Backend', aliases: [], default: true }],
			})
			createTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'w1'], { from: 'node' })

			expect(createTaskMock).toHaveBeenCalledWith('w1', 'Task', expect.objectContaining({ projects: ['p9'] }))
		})

		it('resolves --project through the project registry', async () => {
			await useConfig({
				schema_version: 2,
				projects: [{ gid: 'p9', name: 'Backend', aliases: ['api'] }],
			})
			createTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(
				['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'w1', '--project', 'api'],
				{
					from: 'node',
				},
			)

			expect(createTaskMock).toHaveBeenCalledWith('w1', 'Task', expect.objectContaining({ projects: ['p9'] }))
		})

		it('sends --project-gid to Asana untouched, as the registry escape hatch', async () => {
			await useConfig({ schema_version: 2, projects: [{ gid: 'p9', name: 'Backend', aliases: [], default: true }] })
			createTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(
				['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'w1', '--project-gid', 'unregistered'],
				{ from: 'node' },
			)

			expect(createTaskMock).toHaveBeenCalledWith('w1', 'Task', expect.objectContaining({ projects: ['unregistered'] }))
		})

		it('uses defaults.assignee when --assignee is not given', async () => {
			await useConfig({
				schema_version: 2,
				projects: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
				defaults: { assignee: 'ali' },
			})
			createTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(['node', 'test', 'task', 'create', 'Task', '--workspace-gid', 'w1'], { from: 'node' })

			expect(createTaskMock).toHaveBeenCalledWith('w1', 'Task', expect.objectContaining({ assignee: '100' }))
		})

		it('leaves task update unassigned when only defaults.assignee is set', async () => {
			await useConfig({
				schema_version: 2,
				projects: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
				defaults: { assignee: 'ali' },
			})
			updateTaskMock.mockResolvedValue({ gid: 't1', name: 'Task' })
			const program = new Command().addCommand(taskCommand())

			await program.parseAsync(['node', 'test', 'task', 'update', 't1', '--name', 'Renamed'], { from: 'node' })

			expect(updateTaskMock).toHaveBeenCalledWith('t1', expect.not.objectContaining({ assignee: expect.anything() }))
		})
	})
})
