import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createTagMock = vi.fn()
const updateTagMock = vi.fn()
const deleteTagMock = vi.fn()
const listTagsForTaskMock = vi.fn()
const listTasksForTagMock = vi.fn()
const addTagToTaskMock = vi.fn()
const removeTagFromTaskMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
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

describe('tags/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
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
})
