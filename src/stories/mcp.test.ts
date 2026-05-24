import { afterEach, describe, expect, it, vi } from 'vitest'

const createStoryMock = vi.fn()
const getTaskMock = vi.fn()

vi.mock('../tasks/api.js', async () => {
	const actual = await vi.importActual<typeof import('../tasks/api.js')>('../tasks/api.js')
	return {
		...actual,
		getTask: getTaskMock,
	}
})

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createStory: createStoryMock,
	}
})

const { registerStoryTools } = await import('./mcp.js')

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
		getTaskMock.mockResolvedValue({
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
})
