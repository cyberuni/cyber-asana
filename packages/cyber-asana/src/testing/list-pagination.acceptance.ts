import { expect, it } from 'vitest'
import type { PaginatedResult, PaginationOptions } from '../pagination.js'

export type ListPaginationAcceptanceDeps = {
	list: (opts?: PaginationOptions) => Promise<unknown>
	includeFetchAll?: boolean
}

function asPaginatedResult<T>(result: unknown): PaginatedResult<T> {
	if (Array.isArray(result)) {
		throw new Error('expected paginated list result')
	}
	return result as PaginatedResult<T>
}

export function defineListPaginationAcceptanceSpecs(deps: ListPaginationAcceptanceDeps) {
	return () => {
		it('returns paginated metadata when limit is set', async () => {
			const result = asPaginatedResult(await deps.list({ limit: 50 }))

			expect(Array.isArray(result.data)).toBe(true)
			expect(result.limit).toBe(50)
			expect(result).toHaveProperty('next_page')
		})

		it('fetchAll merges pages and reports truncation', async () => {
			if (deps.includeFetchAll === false) return

			const result = asPaginatedResult(await deps.list({ fetchAll: true, maxPages: 2, limit: 1 }))

			expect(result.data.length).toBeGreaterThanOrEqual(2)
			expect(result.page_count).toBe(2)
			expect(result.truncated).toBe(true)
		})
	}
}
