import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StoryApi } from './api.js'

const createStoryMock = vi.fn()
const getTaskTemplateDataMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createStory: createStoryMock,
		getTaskTemplateData: getTaskTemplateDataMock,
	}
})

const { registerStoryTools } = await import('./mcp.js')

function storyDeps(overrides: Partial<StoryApi> = {}): StoryApi {
	return {
		listStories: vi.fn(),
		createStory: vi.fn(),
		getStory: vi.fn(),
		updateStory: vi.fn(),
		deleteStory: vi.fn(),
		getTaskTemplateData: vi.fn(),
		...overrides,
	}
}

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

describe('stories/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_story_create forwards html_text', async () => {
		createStoryMock.mockResolvedValue({ gid: 'story1', text: 'Rich' })
		const server = createServer()
		registerStoryTools(server as any)

		await server.handlers.get('asana_story_create')?.({
			task_gid: 'task1',
			html_text: '<body><strong>Rich</strong></body>',
		})

		expect(createStoryMock).toHaveBeenCalledWith('task1', {
			html_text: '<body><strong>Rich</strong></body>',
		})
	})

	it('asana_comment_create applies templates to html_text', async () => {
		getTaskTemplateDataMock.mockResolvedValue({
			name: 'Fix bug',
			assignee: { name: 'Alice' },
			due_on: '2026-06-01',
			notes: 'Ship it',
		})
		createStoryMock.mockResolvedValue({ gid: 'story1', text: 'Rich' })
		const server = createServer()
		registerStoryTools(server as any)

		await server.handlers.get('asana_comment_create')?.({
			task_gid: 'task1',
			html_text: '<body><strong>{task.name}</strong> for {task.assignee}</body>',
			template: true,
		})

		expect(createStoryMock).toHaveBeenCalledWith('task1', {
			html_text: '<body><strong>Fix bug</strong> for Alice</body>',
		})
	})

	it('asana_story_get reads one story', async () => {
		const getStory = vi.fn().mockResolvedValue({ gid: 'story1', text: 'Hi' })
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ getStory }))

		await server.handlers.get('asana_story_get')?.({ story_gid: 'story1' })

		expect(getStory).toHaveBeenCalledWith('story1', undefined)
	})

	it('asana_comment_update replaces the comment text', async () => {
		const updateStory = vi.fn().mockResolvedValue({ gid: 'story1', text: 'Corrected' })
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ updateStory }))

		await server.handlers.get('asana_comment_update')?.({ story_gid: 'story1', text: 'Corrected' })

		expect(updateStory).toHaveBeenCalledWith('story1', { text: 'Corrected' })
	})

	it('asana_story_update forwards html_text', async () => {
		const updateStory = vi.fn().mockResolvedValue({ gid: 'story1', text: 'Corrected' })
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ updateStory }))

		await server.handlers.get('asana_story_update')?.({
			story_gid: 'story1',
			html_text: '<body><strong>Corrected</strong></body>',
		})

		expect(updateStory).toHaveBeenCalledWith('story1', { html_text: '<body><strong>Corrected</strong></body>' })
	})

	it('asana_story_delete removes the comment and reports it', async () => {
		const deleteStory = vi.fn().mockResolvedValue(undefined)
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ deleteStory }))

		const result = await server.handlers.get('asana_story_delete')?.({ story_gid: 'story1' })

		expect(deleteStory).toHaveBeenCalledWith('story1')
		expect(JSON.parse(result.content[0].text)).toMatchObject({ deleted: true, gid: 'story1' })
	})

	it('asana_story_delete succeeds when the comment is already gone', async () => {
		const deleteStory = vi.fn().mockRejectedValue({
			response: { status: 404, body: { errors: [{ message: 'Not Found' }] } },
		})
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ deleteStory }))

		const result = await server.handlers.get('asana_story_delete')?.({ story_gid: 'story1' })

		expect(JSON.parse(result.content[0].text)).toMatchObject({ deleted: true, already_absent: true })
	})

	it('story tools can use injected dependencies', async () => {
		const injectedCreateStory = vi.fn().mockResolvedValue({ gid: 'story1', text: 'Comment' })
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ createStory: injectedCreateStory }))

		await server.handlers.get('asana_story_create')?.({
			task_gid: 'task1',
			text: 'Hi',
		})

		expect(injectedCreateStory).toHaveBeenCalledWith('task1', { text: 'Hi' })
	})
	it('asana_story_create forwards is_pinned', async () => {
		createStoryMock.mockResolvedValue({ gid: 'story1' })
		const server = createServer()
		registerStoryTools(server as any)

		await server.handlers.get('asana_story_create')?.({ task_gid: 'task1', text: 'Pin me', is_pinned: true })

		expect(createStoryMock).toHaveBeenCalledWith('task1', { text: 'Pin me', is_pinned: true })
	})

	it('asana_story_update forwards is_pinned without a replacement body', async () => {
		const updateStory = vi.fn().mockResolvedValue({ gid: 'story1' })
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ updateStory }))

		await server.handlers.get('asana_story_update')?.({ story_gid: 'story1', is_pinned: false })

		expect(updateStory).toHaveBeenCalledWith('story1', { is_pinned: false })
	})
	it('asana_story_create forwards sticker_name', async () => {
		createStoryMock.mockResolvedValue({ gid: 'story1' })
		const server = createServer()
		registerStoryTools(server as any)

		await server.handlers.get('asana_story_create')?.({ task_gid: 'task1', text: 'Nice', sticker_name: 'trophy' })

		expect(createStoryMock).toHaveBeenCalledWith('task1', { text: 'Nice', sticker_name: 'trophy' })
	})

	it('asana_story_update forwards sticker_name without a replacement body', async () => {
		const updateStory = vi.fn().mockResolvedValue({ gid: 'story1' })
		const server = createServer()
		registerStoryTools(server as any, storyDeps({ updateStory }))

		await server.handlers.get('asana_story_update')?.({ story_gid: 'story1', sticker_name: 'heart' })

		expect(updateStory).toHaveBeenCalledWith('story1', { sticker_name: 'heart' })
	})
})
