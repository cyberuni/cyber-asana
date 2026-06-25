import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createTaskMock = vi.fn()
const updateTaskMock = vi.fn()
const addFollowersToTaskMock = vi.fn()
const removeFollowersFromTaskMock = vi.fn()
const getTasksByGidMock = vi.fn()
const getTaskMock = vi.fn()

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
				'p1,p2',
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
			projects: ['p1', 'p2'],
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
})
