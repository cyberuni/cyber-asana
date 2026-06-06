import { vi } from 'vitest'
import type { ListResult, PaginationOptions } from '../pagination.js'

export function paginatingListResult<T>(pages: T[][], opts?: PaginationOptions): ListResult<T> {
	const pageOne = pages[0] ?? []
	const pageTwo = pages[1] ?? []

	if (opts?.fetchAll) {
		const maxPages = opts.maxPages ?? 10
		const selected = pages.slice(0, maxPages)
		return {
			data: selected.flat(),
			next_page: maxPages < pages.length ? { offset: 'page3' } : null,
			limit: opts.limit ?? 100,
			page_count: selected.length,
			truncated: maxPages < pages.length,
		}
	}

	if (opts?.offset === 'page2') {
		return {
			data: pageTwo,
			next_page: pages.length > 2 ? { offset: 'page3' } : null,
			limit: opts.limit ?? 100,
		}
	}

	return {
		data: pageOne,
		next_page: pages.length > 1 ? { offset: 'page2' } : null,
		limit: opts?.limit ?? 100,
	}
}

export function createPaginatingScopedListMock<T>(pages: T[][]) {
	return vi.fn(async (_scopeGid: string, opts?: PaginationOptions) => paginatingListResult(pages, opts))
}

export function createPaginatingListMock<T>(pages: T[][]) {
	return vi.fn(async (opts?: PaginationOptions) => paginatingListResult(pages, opts))
}
