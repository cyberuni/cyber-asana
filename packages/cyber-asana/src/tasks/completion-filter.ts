import type { ListResult, PaginationOptions } from '../platform/pagination.js'

/**
 * The two completion filters a task list takes.
 *
 * - `completedSince` keeps only tasks completed at or after that ISO 8601 date or time.
 * - `incompleteOrCompletedSince` is Asana's own `completed_since`: tasks that are incomplete
 *   or were completed since that time; `"now"` selects incomplete tasks only.
 */
export type CompletionFilter = {
	completedSince?: string
	incompleteOrCompletedSince?: string
}

/** What a gateway list call takes: only Asana's own filter reaches the API. */
export type RawCompletionFilter = Pick<CompletionFilter, 'incompleteOrCompletedSince'>

const COMPLETION_FIELDS = ['completed', 'completed_at']

/** Fields requested when the caller names none: Asana's compact task, plus what the filter reads. */
const DEFAULT_FILTER_FIELDS = 'gid,name,completed,completed_at'

type CompletableTask = { completed?: boolean | null; completed_at?: string | null }

function parseCompletedSince(value: string) {
	const time = Date.parse(value)
	if (Number.isNaN(time)) {
		throw new Error(
			`completedSince must be an ISO 8601 date or time, got "${value}". For incomplete tasks use incompleteOrCompletedSince: "now".`,
		)
	}
	return time
}

function withCompletionFields(optFields: string | undefined) {
	if (optFields === undefined) return DEFAULT_FILTER_FIELDS
	const fields = optFields.split(',').filter(Boolean)
	return [...fields, ...COMPLETION_FIELDS.filter((field) => !fields.includes(field))].join(',')
}

function keep<T>(result: ListResult<T>, predicate: (item: T) => boolean): ListResult<T> {
	if (Array.isArray(result)) return result.filter(predicate)
	return { ...result, data: result.data.filter(predicate) }
}

/**
 * Lists tasks through `list`, applying `completedSince` client-side.
 *
 * Asana has no "completed after" filter, so the request carries Asana's `completed_since` (which already
 * drops tasks completed earlier) and the open tasks it also returns are removed here. The page cursor and
 * paging metadata are the underlying page's, so a page can hold fewer than `limit` tasks.
 */
export async function listWithCompletionFilter<T, O extends PaginationOptions & CompletionFilter>(
	opts: O | undefined,
	list: (opts: (Omit<O, keyof CompletionFilter> & RawCompletionFilter) | undefined) => Promise<ListResult<T>>,
): Promise<ListResult<T>> {
	if (opts?.completedSince === undefined) return list(opts)
	const { completedSince, incompleteOrCompletedSince, ...rest } = opts
	if (incompleteOrCompletedSince !== undefined) {
		throw new Error('completedSince and incompleteOrCompletedSince are mutually exclusive')
	}
	const since = parseCompletedSince(completedSince)
	const result = await list({
		...rest,
		incompleteOrCompletedSince: completedSince,
		optFields: withCompletionFields(rest.optFields),
	})
	return keep(result, (task) => {
		const { completed, completed_at } = task as CompletableTask
		return completed === true && typeof completed_at === 'string' && Date.parse(completed_at) >= since
	})
}
