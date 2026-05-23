export type PaginationOptions = {
	limit?: number
	offset?: string
	optFields?: string
}

export type NextPage = {
	offset?: string
	path?: string
	uri?: string
}

export type PaginatedResult<T> = {
	data: T[]
	next_page: NextPage | null
}

export type ListResult<T> = T[] | PaginatedResult<T>

export function toAsanaPaginationOptions(opts?: PaginationOptions) {
	const asanaOpts: { limit?: number; offset?: string; opt_fields?: string } = {}
	if (opts?.limit !== undefined) asanaOpts.limit = opts.limit
	if (opts?.offset !== undefined) asanaOpts.offset = opts.offset
	if (opts?.optFields !== undefined) asanaOpts.opt_fields = opts.optFields
	return asanaOpts
}

export function shouldReturnPageMetadata(opts?: PaginationOptions) {
	return opts?.limit !== undefined || opts?.offset !== undefined
}

export function unwrapListResponse<T = any>(
	res: { data: T[]; _response?: { next_page?: NextPage | null } },
	opts?: PaginationOptions,
) {
	if (!shouldReturnPageMetadata(opts)) return res.data
	return {
		data: res.data,
		next_page: res._response?.next_page ?? null,
	}
}

export function listItems<T = any>(result: ListResult<T>) {
	return Array.isArray(result) ? result : result.data
}

export function nextPageOffset<T>(result: ListResult<T>) {
	return Array.isArray(result) ? undefined : result.next_page?.offset
}
