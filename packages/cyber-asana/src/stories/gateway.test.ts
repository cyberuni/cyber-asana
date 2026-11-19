import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createAsanaStoryGateway } from './gateway.js'

const client = {} as Asana.ApiClient
const stories = Asana.StoriesApi.prototype

describe('stories/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listStories sends the list filters under Asana names beside the pagination params', async () => {
		const spy = vi.spyOn(stories, 'getStoriesForTask').mockResolvedValue({ data: [{ gid: 's1' }] } as never)

		await createAsanaStoryGateway(client).listStories('t1', {
			limit: 5,
			optFields: 'text',
			createdAfter: '2026-11-01T00:00:00Z',
			commentsOnly: true,
			sortAscending: false,
		})

		expect(spy).toHaveBeenCalledWith('t1', {
			limit: 5,
			opt_fields: 'text',
			created_after: '2026-11-01T00:00:00Z',
			resource_subtype: 'comment_added',
			sort_ascending: false,
		})
	})

	it('listStories sends no filter keys when none are given', async () => {
		const spy = vi.spyOn(stories, 'getStoriesForTask').mockResolvedValue({ data: [] } as never)

		await createAsanaStoryGateway(client).listStories('t1', { limit: 5 })

		expect(spy).toHaveBeenCalledWith('t1', { limit: 5 })
	})

	it('listGoalStories sends the list filters under Asana names', async () => {
		const spy = vi.spyOn(stories, 'getStoriesForGoal').mockResolvedValue({ data: [] } as never)

		await createAsanaStoryGateway(client).listGoalStories('g1', {
			limit: 5,
			createdAfter: '2026-11-01T00:00:00Z',
			commentsOnly: true,
			sortAscending: true,
		})

		expect(spy).toHaveBeenCalledWith('g1', {
			limit: 5,
			created_after: '2026-11-01T00:00:00Z',
			resource_subtype: 'comment_added',
			sort_ascending: true,
		})
	})

	it('createStory sends parent_comment in the body', async () => {
		const spy = vi.spyOn(stories, 'createStoryForTask').mockResolvedValue({ data: { gid: 's2' } } as never)

		await createAsanaStoryGateway(client).createStory('t1', { text: 'Agreed', parent_comment: 'c1' })

		expect(spy).toHaveBeenCalledWith({ data: { text: 'Agreed', parent_comment: 'c1' } }, 't1', {})
	})
})
