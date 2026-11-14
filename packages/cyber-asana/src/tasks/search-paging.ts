import type { SearchTasksOptions } from './gateway.js'

/** Asana's task search returns at most this many tasks per call and has no offset. */
export const SEARCH_PAGE_SIZE = 100

export type SearchPage = { gid: string; created_at?: string } & Record<string, unknown>

export type PagedSearchResult<T> = { data: T[]; page_count: number; truncated: boolean }

/**
 * Collect every match of a task search past the 100-result cap. Search has no offset, so each call sorts
 * by `created_at` ascending and bounds the next call to tasks created after the last one seen. Two
 * tasks created in the same instant across a page boundary can be missed, and a full page with
 * nothing new stops the walk with `truncated: true` rather than looping.
 */
export async function searchAllPages<T extends SearchPage>(
	search: (workspaceGid: string, opts: SearchTasksOptions) => Promise<T[]>,
	workspaceGid: string,
	opts: SearchTasksOptions,
	limits: { maxPages?: number } = {},
): Promise<PagedSearchResult<T>> {
	const maxPages = limits.maxPages ?? 10
	const fields = opts.optFields
	const optFields = fields === undefined || /(^|,)created_at(,|$)/.test(fields) ? fields : `${fields},created_at`
	const seen = new Map<string, T>()
	let after = opts.createdAtAfter
	let pages = 0
	while (pages < maxPages) {
		const batch = await search(workspaceGid, {
			...opts,
			...(optFields !== undefined && { optFields }),
			...(after !== undefined && { createdAtAfter: after }),
			sortBy: 'created_at',
			sortAscending: true,
		})
		pages++
		const before = seen.size
		for (const task of batch) if (!seen.has(task.gid)) seen.set(task.gid, task)
		if (batch.length < SEARCH_PAGE_SIZE) return { data: [...seen.values()], page_count: pages, truncated: false }
		const last = batch.at(-1)?.created_at
		if (seen.size === before || last === undefined) break
		after = last
	}
	return { data: [...seen.values()], page_count: pages, truncated: true }
}
