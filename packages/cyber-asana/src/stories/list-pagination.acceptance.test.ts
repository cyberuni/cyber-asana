import { describe, expect, it, vi } from 'vitest'
import { createPaginatingScopedListMock } from '../testing/paginating-gateway.js'
import { createStoryApi } from './api.js'
import type { StoryGateway } from './gateway.js'
import { defineStoryListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const taskGid = 'task-test'
const pages = [
	[{ gid: 'story1', text: 'First' }],
	[{ gid: 'story2', text: 'Second' }],
	[{ gid: 'story3', text: 'Third' }],
]

function createPaginatingStoryGateway(): StoryGateway {
	return {
		listStories: createPaginatingScopedListMock(pages),
		createStory: vi.fn(),
		getTaskTemplateData: vi.fn(),
	}
}

describe(
	'stories/list pagination acceptance',
	defineStoryListPaginationAcceptanceSpecs({
		getApi: () => createStoryApi(createPaginatingStoryGateway()),
		taskGid,
	}),
)

describe('stories/list pagination acceptance gateway double', () => {
	it('exercises listStories without importing the Asana SDK', async () => {
		const gateway = createPaginatingStoryGateway()
		const api = createStoryApi(gateway)

		const result = await api.listStories(taskGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'story1', text: 'First' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listStories).toHaveBeenCalledWith(taskGid, { limit: 25 })
	})
})
