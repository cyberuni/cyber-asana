import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createStory, interpolateTemplate, listStories } from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockStory = { gid: '123', text: 'A comment', resource_type: 'story' }

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
		vi.spyOn(Asana.StoriesApi.prototype, 'createStoryForTask').mockRejectedValue(
			new Error('html_text: malformed rich text payload'),
		)

		await expect(createStory('task1', { html_text: '<body><strong>Rich</body>' })).rejects.toThrow(
			'Asana rejected html_text',
		)
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
