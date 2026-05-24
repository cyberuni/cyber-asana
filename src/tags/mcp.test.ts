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

const { registerTagTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

describe('tags/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_tag_create forwards notes and color', async () => {
		createTagMock.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_create')?.({
			workspace_gid: 'ws1',
			name: 'Urgent',
			color: 'red',
			notes: 'Act fast',
		})

		expect(createTagMock).toHaveBeenCalledWith('ws1', 'Urgent', {
			color: 'red',
			notes: 'Act fast',
		})
	})

	it('asana_tag_update forwards mutable tag fields', async () => {
		updateTagMock.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_update')?.({
			tag_gid: 'tag1',
			name: 'Urgent',
			color: 'red',
			notes: 'Act fast',
		})

		expect(updateTagMock).toHaveBeenCalledWith('tag1', {
			name: 'Urgent',
			color: 'red',
			notes: 'Act fast',
		})
	})

	it('asana_tag_delete removes a tag', async () => {
		deleteTagMock.mockResolvedValue(undefined)
		const server = createServer()
		registerTagTools(server as any)

		const result = await server.handlers.get('asana_tag_delete')?.({
			tag_gid: 'tag1',
		})

		expect(deleteTagMock).toHaveBeenCalledWith('tag1')
		expect(result).toEqual({
			content: [{ type: 'text', text: JSON.stringify({ ok: true, deleted: 'tag1' }) }],
		})
	})

	it('asana_tag_list_for_task forwards pagination options', async () => {
		listTagsForTaskMock.mockResolvedValue({ data: [] })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_list_for_task')?.({
			task_gid: 'task1',
			limit: 25,
			opt_fields: 'gid,name,color',
		})

		expect(listTagsForTaskMock).toHaveBeenCalledWith('task1', {
			limit: 25,
			optFields: 'gid,name,color',
		})
	})

	it('asana_tag_list_tasks forwards pagination options', async () => {
		listTasksForTagMock.mockResolvedValue({ data: [] })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_list_tasks')?.({
			tag_gid: 'tag1',
			limit: 10,
			opt_fields: 'gid,name,completed',
		})

		expect(listTasksForTagMock).toHaveBeenCalledWith('tag1', {
			limit: 10,
			optFields: 'gid,name,completed',
		})
	})

	it('asana_tag_add_to_task associates a tag to a task', async () => {
		addTagToTaskMock.mockResolvedValue({ gid: 'task1' })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_add_to_task')?.({
			task_gid: 'task1',
			tag_gid: 'tag1',
		})

		expect(addTagToTaskMock).toHaveBeenCalledWith('task1', 'tag1')
	})

	it('asana_tag_remove_from_task dissociates a tag from a task', async () => {
		removeTagFromTaskMock.mockResolvedValue({ gid: 'task1' })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_remove_from_task')?.({
			task_gid: 'task1',
			tag_gid: 'tag1',
		})

		expect(removeTagFromTaskMock).toHaveBeenCalledWith('task1', 'tag1')
	})
})
