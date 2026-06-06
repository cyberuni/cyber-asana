import { describe, expect, it, vi } from 'vitest'
import { defineListPaginationAcceptanceSpecs } from './list-pagination.acceptance.js'

function createPaginatingListFn() {
	const pageOne = [{ gid: 'item1' }]
	const pageTwo = [{ gid: 'item2' }]
	const pageThree = [{ gid: 'item3' }]

	return vi.fn(async (opts?: { limit?: number; offset?: string; fetchAll?: boolean; maxPages?: number }) => {
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
	})
}

describe(
	'testing/list-pagination acceptance',
	defineListPaginationAcceptanceSpecs({
		list: createPaginatingListFn(),
	}),
)

describe('testing/list-pagination acceptance list fn', () => {
	it('exercises list without importing the Asana SDK', async () => {
		const list = createPaginatingListFn()

		const result = await list({ limit: 25 })

		expect(result).toEqual({
			data: [{ gid: 'item1' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
		expect(list).toHaveBeenCalledWith({ limit: 25 })
	})
})
