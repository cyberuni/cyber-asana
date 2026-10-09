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
		expect(JSON.parse(result.content[0].text)).toEqual({
			deleted: true,
			resource: 'tag',
			gid: 'tag1',
			already_absent: false,
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

	it('tag tools can use an injected api dependency', async () => {
		const injectedUpdateTag = vi.fn().mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const server = createServer()
		registerTagTools(server as any, {
			listTags: vi.fn(),
			getTag: vi.fn(),
			createTag: vi.fn(),
			updateTag: injectedUpdateTag,
			deleteTag: vi.fn(),
			listTagsForTask: vi.fn(),
			listTasksForTag: vi.fn(),
			addTagToTask: vi.fn(),
			removeTagFromTask: vi.fn(),
		})

		await server.handlers.get('asana_tag_update')?.({
			tag_gid: 'tag1',
			name: 'Urgent',
		})

		expect(injectedUpdateTag).toHaveBeenCalledWith('tag1', { name: 'Urgent', color: undefined, notes: undefined })
	})

	it('asana_tag_create forwards follower_gids', async () => {
		createTagMock.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_create')?.({
			workspace_gid: 'ws1',
			name: 'Urgent',
			follower_gids: ['u1', 'u2'],
		})

		expect(createTagMock).toHaveBeenCalledWith('ws1', 'Urgent', { followers: ['u1', 'u2'] })
	})

	it('asana_tag_create accepts follower_gids as a comma-separated string', async () => {
		createTagMock.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_create')?.({
			workspace_gid: 'ws1',
			name: 'Urgent',
			follower_gids: 'u1,u2',
		})

		expect(createTagMock).toHaveBeenCalledWith('ws1', 'Urgent', { followers: ['u1', 'u2'] })
	})

	it('asana_tag_update clears the colour with clear_color', async () => {
		updateTagMock.mockResolvedValue({ gid: 'tag1', name: 'Urgent' })
		const server = createServer()
		registerTagTools(server as any)

		await server.handlers.get('asana_tag_update')?.({ tag_gid: 'tag1', clear_color: true })

		expect(updateTagMock).toHaveBeenCalledWith('tag1', { color: null })
	})

	it('asana_tag_delete succeeds when the tag is already gone', async () => {
		deleteTagMock.mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const server = createServer()
		registerTagTools(server as any)

		const result = await server.handlers.get('asana_tag_delete')?.({ tag_gid: 'tag1' })

		expect(JSON.parse(result.content[0].text)).toMatchObject({ deleted: true, already_absent: true })
	})
})
