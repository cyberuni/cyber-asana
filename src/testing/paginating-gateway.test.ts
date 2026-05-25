import { describe, expect, it } from 'vitest'
import { createPaginatingListMock, createPaginatingScopedListMock, paginatingListResult } from './paginating-gateway.js'

describe('testing/paginating-gateway', () => {
	it('returns first page metadata by default', () => {
		const result = paginatingListResult([[{ gid: '1' }], [{ gid: '2' }]], { limit: 25 })

		expect(result).toEqual({
			data: [{ gid: '1' }],
			next_page: { offset: 'page2' },
			limit: 25,
		})
	})

	it('merges pages when fetchAll is set', () => {
		const result = paginatingListResult([[{ gid: '1' }], [{ gid: '2' }], [{ gid: '3' }]], {
			fetchAll: true,
			maxPages: 2,
			limit: 1,
		})

		expect(Array.isArray(result)).toBe(false)
		if (Array.isArray(result)) throw new Error('expected paginated result')
		expect(result.data).toEqual([{ gid: '1' }, { gid: '2' }])
		expect(result.page_count).toBe(2)
		expect(result.truncated).toBe(true)
	})

	it('createPaginatingScopedListMock passes scope gid through', async () => {
		const list = createPaginatingScopedListMock([[{ gid: '1' }]])
		const result = await list('scope1', { limit: 10 })

		expect(list).toHaveBeenCalledWith('scope1', { limit: 10 })
		expect(result).toEqual({
			data: [{ gid: '1' }],
			next_page: null,
			limit: 10,
		})
	})

	it('createPaginatingListMock handles unscoped lists', async () => {
		const list = createPaginatingListMock([[{ gid: '1' }], [{ gid: '2' }]])
		const result = await list({ limit: 5 })

		expect(list).toHaveBeenCalledWith({ limit: 5 })
		expect(Array.isArray(result)).toBe(false)
		if (Array.isArray(result)) throw new Error('expected paginated result')
		expect(result.limit).toBe(5)
	})
})
