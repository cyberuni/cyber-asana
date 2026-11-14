import { describe, expect, it, vi } from 'vitest'
import { SEARCH_PAGE_SIZE, searchAllPages } from './search-paging.js'

const task = (n: number, createdAt = `2026-01-01T00:00:${String(n % 60).padStart(2, '0')}.000Z`) => ({
	gid: String(n),
	created_at: createdAt,
})

const page = (from: number, count: number) =>
	Array.from({ length: count }, (_, i) => task(from + i, `2026-02-${String(from + i).padStart(3, '0')}`))

describe('tasks/search-paging', () => {
	it('returns one short page without asking for more', async () => {
		const search = vi.fn().mockResolvedValue(page(1, 3))

		const result = await searchAllPages(search, 'ws', { text: 'x' })

		expect(result).toEqual({ data: page(1, 3), page_count: 1, truncated: false })
		expect(search).toHaveBeenCalledTimes(1)
		expect(search).toHaveBeenCalledWith(
			'ws',
			expect.objectContaining({ text: 'x', sortBy: 'created_at', sortAscending: true }),
		)
	})

	it('pages past 100 by sorting on created_at and bounding after the last one seen', async () => {
		const first = page(1, SEARCH_PAGE_SIZE)
		const search = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(page(101, 5))

		const result = await searchAllPages(search, 'ws', {})

		expect(result.data).toHaveLength(SEARCH_PAGE_SIZE + 5)
		expect(result.page_count).toBe(2)
		expect(search.mock.calls[1]?.[1]).toMatchObject({ createdAtAfter: first.at(-1)?.created_at })
	})

	it('adds created_at to optFields so it can page, and keeps the caller fields', async () => {
		const search = vi.fn().mockResolvedValue([])

		await searchAllPages(search, 'ws', { optFields: 'gid,name' })

		expect(search.mock.calls[0]?.[1]).toMatchObject({ optFields: 'gid,name,created_at' })
	})

	it('stops with truncated: true at maxPages', async () => {
		const search = vi.fn().mockImplementation(async (_ws, opts) => {
			const n = opts.createdAtAfter ? Number(opts.createdAtAfter.slice(-3)) : 0
			return page(n + 1, SEARCH_PAGE_SIZE)
		})

		const result = await searchAllPages(search, 'ws', {}, { maxPages: 2 })

		expect(result.truncated).toBe(true)
		expect(result.page_count).toBe(2)
		expect(search).toHaveBeenCalledTimes(2)
	})

	it('stops instead of looping when a full page adds nothing new', async () => {
		const same = Array.from({ length: SEARCH_PAGE_SIZE }, (_, i) => task(i, '2026-03-01T00:00:00.000Z'))
		const search = vi.fn().mockResolvedValue(same)

		const result = await searchAllPages(search, 'ws', {}, { maxPages: 10 })

		expect(search).toHaveBeenCalledTimes(2)
		expect(result.data).toHaveLength(SEARCH_PAGE_SIZE)
		expect(result.truncated).toBe(true)
	})
})
