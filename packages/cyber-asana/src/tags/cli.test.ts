import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createTagMock = vi.fn()
const updateTagMock = vi.fn()
const deleteTagMock = vi.fn()
const listTagsForTaskMock = vi.fn()
const listTasksForTagMock = vi.fn()
const addTagToTaskMock = vi.fn()
const removeTagFromTaskMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		createTag: createTagMock,
		updateTag: updateTagMock,
		deleteTag: deleteTagMock,
		listTagsForTask: listTagsForTaskMock,
		listTasksForTag: listTasksForTagMock,
		addTagToTask: addTagToTaskMock,
		removeTagFromTask: removeTagFromTaskMock,
	}
})

const { tagCommand } = await import('./cli.js')

function tagApiStub() {
	return {
		listTags: vi.fn(),
		getTag: vi.fn(),
		createTag: vi.fn(),
		updateTag: vi.fn(),
		deleteTag: vi.fn(),
		listTagsForTask: vi.fn(),
		listTasksForTag: vi.fn(),
		addTagToTask: vi.fn(),
		removeTagFromTask: vi.fn(),
	}
}

describe('tags/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('tag list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listTags = vi.fn().mockResolvedValue([{ gid: 'tag1', name: 'Urgent' }])
		const program = new Command().addCommand(tagCommand({ ...tagApiStub(), listTags }))

		await program.parseAsync(['node', 'test', 'tag', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listTags).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'gid,name,color' }))
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 tag(s)')
		expect(lines.some((l) => l.includes('cyber-asana tag tasks <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('tag tasks applies the task default field set and a count summary', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listTasksForTag = vi.fn().mockResolvedValue([{ gid: 't1', name: 'Fix it' }])
		const program = new Command().addCommand(tagCommand({ ...tagApiStub(), listTasksForTag }))

		await program.parseAsync(['node', 'test', 'tag', 'tasks', 'tag1'], { from: 'node' })

		expect(listTasksForTag).toHaveBeenCalledWith(
			'tag1',
			expect.objectContaining({ optFields: 'gid,name,completed,due_on' }),
		)
		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('\n1 task(s)')
		logSpy.mockRestore()
	})

	it('tag list respects an explicit --opt-fields override', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listTags = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(tagCommand({ ...tagApiStub(), listTags }))

		await program.parseAsync(['node', 'test', 'tag', 'list', '--workspace-gid', 'ws1', '--opt-fields', 'name'], {
			from: 'node',
		})

		expect(listTags).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'name' }))
		vi.restoreAllMocks()
	})

	it('tag delete emits a structured acknowledgement with --json', async () => {
		deleteTagMock.mockResolvedValue(undefined)
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(tagCommand())

		await program.parseAsync(['node', 'test', '--json', 'tag', 'delete', 'tag1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'tag', gid: 'tag1', already_absent: false }, null, 2),
		)
		logSpy.mockRestore()
	})

	it('tag create forwards notes and color', async () => {
		createTagMock.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const program = new Command().addCommand(tagCommand())

		await program.parseAsync(
			['node', 'test', 'tag', 'create', 'Urgent', '--workspace-gid', 'ws1', '--color', 'red', '--notes', 'Act fast'],
			{ from: 'node' },
		)

		expect(createTagMock).toHaveBeenCalledWith('ws1', 'Urgent', {
			color: 'red',
			notes: 'Act fast',
		})
	})

	it('tag update forwards mutable tag fields', async () => {
		updateTagMock.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const program = new Command().addCommand(tagCommand())

		await program.parseAsync(
			['node', 'test', 'tag', 'update', 'tag1', '--name', 'Urgent', '--color', 'red', '--notes', 'Act fast'],
			{ from: 'node' },
		)

		expect(updateTagMock).toHaveBeenCalledWith('tag1', {
			name: 'Urgent',
			color: 'red',
			notes: 'Act fast',
		})
	})

	it('tag delete removes a tag by gid', async () => {
		deleteTagMock.mockResolvedValue(undefined)
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(tagCommand())

		await program.parseAsync(['node', 'test', 'tag', 'delete', 'tag1'], { from: 'node' })

		expect(deleteTagMock).toHaveBeenCalledWith('tag1')
		expect(logSpy).toHaveBeenCalledWith('Deleted tag tag1')
	})

	it('tag task list forwards task gid and pagination options', async () => {
		listTagsForTaskMock.mockResolvedValue({ data: [] })
		const program = new Command().addCommand(tagCommand())

		await program.parseAsync(
			['node', 'test', 'tag', 'task', 'list', 'task1', '--opt-fields', 'gid,name,color', '--limit', '25'],
			{ from: 'node' },
		)

		expect(listTagsForTaskMock).toHaveBeenCalledWith('task1', {
			limit: 25,
			optFields: 'gid,name,color',
		})
	})

	it('tag tasks forwards tag gid and pagination options', async () => {
		listTasksForTagMock.mockResolvedValue({ data: [] })
		const program = new Command().addCommand(tagCommand())

		await program.parseAsync(
			['node', 'test', 'tag', 'tasks', 'tag1', '--opt-fields', 'gid,name,completed', '--limit', '10'],
			{ from: 'node' },
		)

		expect(listTasksForTagMock).toHaveBeenCalledWith('tag1', {
			limit: 10,
			optFields: 'gid,name,completed',
		})
	})

	it('tag task add associates a tag to a task', async () => {
		addTagToTaskMock.mockResolvedValue({ gid: 'task1' })
		const program = new Command().addCommand(tagCommand())

		await program.parseAsync(['node', 'test', 'tag', 'task', 'add', 'task1', 'tag1'], { from: 'node' })

		expect(addTagToTaskMock).toHaveBeenCalledWith('task1', 'tag1')
	})

	it('tag task remove dissociates a tag from a task', async () => {
		removeTagFromTaskMock.mockResolvedValue({ gid: 'task1' })
		const program = new Command().addCommand(tagCommand())

		await program.parseAsync(['node', 'test', 'tag', 'task', 'remove', 'task1', 'tag1'], { from: 'node' })

		expect(removeTagFromTaskMock).toHaveBeenCalledWith('task1', 'tag1')
	})

	it('tag command can use an injected api dependency', async () => {
		const injectedCreateTag = vi.fn().mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const program = new Command().addCommand(
			tagCommand({
				listTags: vi.fn(),
				getTag: vi.fn(),
				createTag: injectedCreateTag,
				updateTag: vi.fn(),
				deleteTag: vi.fn(),
				listTagsForTask: vi.fn(),
				listTasksForTag: vi.fn(),
				addTagToTask: vi.fn(),
				removeTagFromTask: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'tag', 'create', 'Urgent', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(injectedCreateTag).toHaveBeenCalledWith('ws1', 'Urgent', {})
	})
	it('tag create adds followers from a comma-separated --follower list', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = tagApiStub()
		api.createTag.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })

		await new Command()
			.addCommand(tagCommand(api))
			.parseAsync(['node', 'test', 'tag', 'create', 'Urgent', '--workspace-gid', 'ws1', '--follower', 'u1,u2'], {
				from: 'node',
			})

		expect(api.createTag).toHaveBeenCalledWith('ws1', 'Urgent', { followers: ['u1', 'u2'] })
	})
	it('tag update clears the colour with --clear-color', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = tagApiStub()
		api.updateTag.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })

		await new Command()
			.addCommand(tagCommand(api))
			.parseAsync(['node', 'test', 'tag', 'update', 'tag1', '--clear-color'], { from: 'node' })

		expect(api.updateTag).toHaveBeenCalledWith('tag1', { color: null })
	})

	it('tag update rejects --color together with --clear-color before calling Asana', async () => {
		const api = tagApiStub()

		await expect(
			new Command()
				.exitOverride()
				.addCommand(tagCommand(api))
				.parseAsync(['node', 'test', 'tag', 'update', 'tag1', '--color', 'red', '--clear-color'], { from: 'node' }),
		).rejects.toThrow('--color and --clear-color are mutually exclusive')
		expect(api.updateTag).not.toHaveBeenCalled()
	})
})
