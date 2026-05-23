import { type Command, InvalidArgumentError } from 'commander'
import type { ListResult, PaginationOptions } from './pagination.js'
import { listItems, nextPageOffset } from './pagination.js'

export type PaginationCliOptions = {
	limit?: number
	offset?: string
	optFields?: string
}

function parseLimit(value: string) {
	const limit = Number(value)
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		throw new InvalidArgumentError('limit must be an integer from 1 to 100')
	}
	return limit
}

export function addPaginationOptions<T extends Command>(cmd: T, opts?: { limit?: boolean }) {
	if (opts?.limit !== false) cmd.option('--limit <number>', 'Results per page, from 1 to 100', parseLimit)
	return cmd
		.option('--offset <token>', 'Offset token returned by a previous paginated response')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
}

export function paginationOptionsFromCli(opts: PaginationCliOptions): PaginationOptions {
	return {
		limit: opts.limit,
		offset: opts.offset,
		optFields: opts.optFields,
	}
}

export function itemsForOutput<T = any>(result: ListResult<T>) {
	return listItems(result)
}

export function printNextPageHint<T>(result: ListResult<T>) {
	const offset = nextPageOffset(result)
	if (offset) console.log(`\nNext offset: ${offset}`)
}
