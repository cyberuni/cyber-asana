import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildErrorBody } from '../platform/error-body.js'
import { createStoryApi, interpolateTemplate } from './api.js'
import { createStory, deleteStory, getStory, listStories, updateStory } from './default.js'

vi.mock('../platform/client.js', () => ({
	createClient: () => ({}),
}))

const mockStory = { gid: '123', text: 'A comment', resource_type: 'story' }

function forbidden() {
	return { response: { status: 403, body: { errors: [{ message: 'Forbidden' }] } } }
}

describe('stories/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listStories calls getStoriesForTask', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'getStoriesForTask').mockResolvedValue({
			data: [mockStory],
		} as never)
		const result = await listStories('task1')
		expect(result).toEqual({ data: [mockStory], next_page: null, limit: 100 })
		expect(Asana.StoriesApi.prototype.getStoriesForTask).toHaveBeenCalledWith('task1', { limit: 100 })
	})

	it('createStory calls createStoryForTask with text', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'createStoryForTask').mockResolvedValue({
			data: mockStory,
		} as never)
		const result = await createStory('task1', { text: 'A comment' })
		expect(result).toEqual(mockStory)
		expect(Asana.StoriesApi.prototype.createStoryForTask).toHaveBeenCalledWith(
			{ data: { text: 'A comment' } },
			'task1',
			{},
		)
	})

	it('createStory calls createStoryForTask with html_text', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'createStoryForTask').mockResolvedValue({
			data: mockStory,
		} as never)

		const result = await createStory('task1', { html_text: '<body><strong>Rich</strong></body>' })

		expect(result).toEqual(mockStory)
		expect(Asana.StoriesApi.prototype.createStoryForTask).toHaveBeenCalledWith(
			{ data: { html_text: '<body><strong>Rich</strong></body>' } },
			'task1',
			{},
		)
	})

	it('createStory surfaces actionable diagnostics for formatted text rejections', async () => {
		const createStoryForTask = vi
			.spyOn(Asana.StoriesApi.prototype, 'createStoryForTask')
			.mockRejectedValue(new Error('html_text: malformed rich text payload'))

		await expect(createStory('task1', { html_text: '<body><strong>Rich</strong></body>' })).rejects.toThrow(
			'Asana rejected html_text',
		)
		expect(createStoryForTask).toHaveBeenCalled()
	})

	it('createStory reports locally-rejected html_text without blaming Asana', async () => {
		const createStoryForTask = vi.spyOn(Asana.StoriesApi.prototype, 'createStoryForTask')

		const unbalanced = (await createStory('task1', { html_text: '<body><strong>Rich</body>' }).catch(
			(error: unknown) => error,
		)) as Error
		const noBody = (await createStory('task1', { html_text: '<div>Rich</div>' }).catch(
			(error: unknown) => error,
		)) as Error

		expect(unbalanced?.message).toBe('html_text has unbalanced closing tags')
		expect(noBody?.message).toBe('html_text must be wrapped in a single <body>...</body> root element')
		expect(createStoryForTask).not.toHaveBeenCalled()
	})
})

describe('stories/api single-story operations', () => {
	afterEach(() => vi.restoreAllMocks())

	it('getStory calls getStory', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'getStory').mockResolvedValue({ data: mockStory } as never)

		const result = await getStory('123')

		expect(result).toEqual(mockStory)
		expect(Asana.StoriesApi.prototype.getStory).toHaveBeenCalledWith('123', {})
	})

	it('updateStory calls updateStory with the replacement text', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'updateStory').mockResolvedValue({ data: mockStory } as never)

		const result = await updateStory('123', { text: 'Corrected' })

		expect(result).toEqual(mockStory)
		expect(Asana.StoriesApi.prototype.updateStory).toHaveBeenCalledWith({ data: { text: 'Corrected' } }, '123', {})
	})

	it('updateStory rejects malformed html_text before calling Asana', async () => {
		const update = vi.spyOn(Asana.StoriesApi.prototype, 'updateStory')

		await expect(updateStory('123', { html_text: '<div>bad</div>' })).rejects.toThrow(
			'html_text must be wrapped in a single <body>...</body> root element',
		)
		expect(update).not.toHaveBeenCalled()
	})

	it('deleteStory calls deleteStory', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'deleteStory').mockResolvedValue({ data: {} } as never)

		await deleteStory('123')

		expect(Asana.StoriesApi.prototype.deleteStory).toHaveBeenCalledWith('123')
	})

	it('updateStory explains that only comments you authored are editable when Asana forbids it', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'updateStory').mockRejectedValue(forbidden())

		const error = await updateStory('123', { text: 'Corrected' }).catch((thrown: unknown) => thrown)

		expect(buildErrorBody(error).error).toMatchObject({
			status: 403,
			hint: expect.stringContaining('you authored'),
		})
	})

	it('deleteStory explains that only comments you authored are deletable when Asana forbids it', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'deleteStory').mockRejectedValue(forbidden())

		const error = await deleteStory('123').catch((thrown: unknown) => thrown)

		expect(buildErrorBody(error).error).toMatchObject({
			status: 403,
			hint: expect.stringContaining('you authored'),
		})
	})

	it('leaves errors other than a permission refusal untouched', async () => {
		vi.spyOn(Asana.StoriesApi.prototype, 'deleteStory').mockRejectedValue({
			response: { status: 404, body: { errors: [{ message: 'Not Found' }] } },
		})

		const error = await deleteStory('123').catch((thrown: unknown) => thrown)

		expect(buildErrorBody(error).error.hint).toBeUndefined()
	})
})

describe('createStoryApi', () => {
	it('uses the provided gateway for story creation', async () => {
		const gatewayCreateStory = vi.fn().mockResolvedValue(mockStory)
		const api = createStoryApi({
			listStories: vi.fn(),
			createStory: gatewayCreateStory,
			getStory: vi.fn(),
			updateStory: vi.fn(),
			deleteStory: vi.fn(),
			getTaskTemplateData: vi.fn(),
		})

		const result = await api.createStory('task1', { text: 'A comment' })

		expect(result).toEqual(mockStory)
		expect(gatewayCreateStory).toHaveBeenCalledWith('task1', { text: 'A comment' })
	})
})

describe('interpolateTemplate', () => {
	it('replaces all task variables', () => {
		const task = { name: 'Fix bug', assignee: { name: 'Alice' }, due_on: '2026-06-01', notes: 'See ticket' }
		const result = interpolateTemplate(
			'Hey {task.assignee}, task "{task.name}" is due {task.due_on}. Notes: {task.notes}',
			task,
		)
		expect(result).toBe('Hey Alice, task "Fix bug" is due 2026-06-01. Notes: See ticket')
	})

	it('replaces multiple occurrences of the same variable', () => {
		const task = { name: 'My Task', assignee: null, due_on: null, notes: '' }
		const result = interpolateTemplate('{task.name} and {task.name}', task)
		expect(result).toBe('My Task and My Task')
	})

	it('falls back to empty string for null/undefined values', () => {
		const task = { name: undefined, assignee: null, due_on: null, notes: undefined }
		const result = interpolateTemplate('{task.name}|{task.assignee}|{task.due_on}|{task.notes}', task)
		expect(result).toBe('|||')
	})

	it('leaves non-template text unchanged', () => {
		const task = { name: 'Task', assignee: null, due_on: null, notes: '' }
		const result = interpolateTemplate('No variables here', task)
		expect(result).toBe('No variables here')
	})

	it('handles missing assignee name gracefully', () => {
		const task = { name: 'Task', assignee: undefined, due_on: null, notes: '' }
		const result = interpolateTemplate('{task.assignee}', task)
		expect(result).toBe('')
	})
})
