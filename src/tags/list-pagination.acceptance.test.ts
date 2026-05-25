import { describe, expect, it, vi } from 'vitest'
import { createTagApi } from './api.js'
import type { TagGateway } from './gateway.js'
import { defineTagListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

const workspaceGid = 'ws-test'

function createPaginatingTagGateway(): TagGateway {
	const pageOne = [{ gid: 'tag1', name: 'urgent' }]
	const pageTwo = [{ gid: 'tag2', name: 'blocked' }]
	const pageThree = [{ gid: 'tag3', name: 'review' }]

	return {
		listTags: vi.fn(async (_workspaceGid, opts) => {
			if (opts?.fetchAll) {
				const maxPages = opts.maxPages ?? 10
				const pages = [pageOne, pageTwo, pageThree].slice(0, maxPages)
				return {
					data: pages.flat(),
					next_page: maxPages < 3 ? { offset: 'page3' } : null,
					limit: opts.limit ?? 100,
					page_count: pages.length,
					truncated: maxPages < 3,
				}
			}

			if (opts?.offset === 'page2') {
				return {
					data: pageTwo,
					next_page: { offset: 'page3' },
					limit: opts.limit ?? 100,
				}
			}

			return {
				data: pageOne,
				next_page: { offset: 'page2' },
				limit: opts?.limit ?? 100,
			}
		}),
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

describe(
	'tags/list pagination acceptance',
	defineTagListPaginationAcceptanceSpecs({
		getApi: () => createTagApi(createPaginatingTagGateway()),
		workspaceGid,
	}),
)

describe('tags/list pagination acceptance gateway double', () => {
	it('exercises listTags without importing the Asana SDK', async () => {
		const gateway = createPaginatingTagGateway()
		const api = createTagApi(gateway)

		const result = await api.listTags(workspaceGid, { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'tag1', name: 'urgent' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(gateway.listTags).toHaveBeenCalledWith(workspaceGid, { limit: 25 })
	})
})
