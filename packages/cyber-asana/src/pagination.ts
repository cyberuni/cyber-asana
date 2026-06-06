export type PaginationOptions = {
	limit?: number
	offset?: string
	optFields?: string
	fetchAll?: boolean
	maxPages?: number
}

export type NextPage = {
	offset?: string
	path?: string
	uri?: string
}

export type PaginatedResult<T> = {
	data: T[]
	next_page: NextPage | null
	limit?: number
	page_count?: number
	truncated?: boolean
}

export type ListResult<T> = T[] | PaginatedResult<T>

export const DEFAULT_PAGE_SIZE = 100
export const DEFAULT_MAX_PAGES = 10

export function toAsanaPaginationOptions(opts?: PaginationOptions, config?: { limit?: boolean }) {
	const asanaOpts: { limit?: number; offset?: string; opt_fields?: string } = {}
	if (config?.limit !== false) asanaOpts.limit = opts?.limit ?? DEFAULT_PAGE_SIZE
	if (opts?.offset !== undefined) asanaOpts.offset = opts.offset
	if (opts?.optFields !== undefined) asanaOpts.opt_fields = opts.optFields
	return asanaOpts
}

export function shouldReturnPageMetadata(opts?: PaginationOptions) {
	return opts?.fetchAll === true || opts?.limit !== undefined || opts?.offset !== undefined || opts === undefined
}

type Page<T> = {
	data: T[] | null
	_response?: { next_page?: NextPage | null }
	nextPage?: () => Promise<Page<T>>
}

export async function collectListResponse<T = any>(
	firstPage: Page<T>,
	opts?: PaginationOptions,
	config?: { limit?: boolean },
): Promise<ListResult<T>> {
	if (opts?.fetchAll !== true) return unwrapListResponse(firstPage, opts, config)

	const data = [...(firstPage.data ?? [])]
	let currentPage = firstPage
	let nextPage = firstPage._response?.next_page ?? null
	const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES
	let pageCount = 1

	while (nextPage && pageCount < maxPages && currentPage.nextPage) {
		currentPage = await currentPage.nextPage()
		pageCount += 1
		data.push(...(currentPage.data ?? []))
		nextPage = currentPage._response?.next_page ?? null
	}

	return {
		data,
		next_page: nextPage,
		...(config?.limit !== false ? { limit: opts.limit ?? DEFAULT_PAGE_SIZE } : {}),
		page_count: pageCount,
		truncated: nextPage !== null,
	}
}

export function unwrapListResponse<T = any>(
	res: { data: T[] | null; _response?: { next_page?: NextPage | null } },
	opts?: PaginationOptions,
	config?: { limit?: boolean },
): ListResult<T> {
	if (!shouldReturnPageMetadata(opts)) return res.data ?? []
	return {
		data: res.data ?? [],
		next_page: res._response?.next_page ?? null,
		...(config?.limit !== false ? { limit: opts?.limit ?? DEFAULT_PAGE_SIZE } : {}),
	}
}

export function listItems<T = any>(result: ListResult<T>) {
	return Array.isArray(result) ? result : result.data
}

export function nextPageOffset<T>(result: ListResult<T>) {
	return Array.isArray(result) ? undefined : result.next_page?.offset
}
