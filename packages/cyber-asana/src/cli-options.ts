import { type Command, InvalidArgumentError, Option } from 'commander'
import { envValue } from './env.js'
import type { ListResult, PaginationOptions } from './pagination.js'
import { listItems, nextPageOffset } from './pagination.js'

export type PaginationCliOptions = {
	limit?: number
	offset?: string
	optFields?: string
	all?: boolean
	maxPages?: number
}

export type CliGidOptions = Record<string, unknown>

function parseLimit(value: string) {
	const limit = Number(value)
	if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
		throw new InvalidArgumentError('limit must be an integer from 1 to 100')
	}
	return limit
}

function parseMaxPages(value: string) {
	const maxPages = Number(value)
	if (!Number.isInteger(maxPages) || maxPages < 1) {
		throw new InvalidArgumentError('max-pages must be an integer greater than 0')
	}
	return maxPages
}

export function addPaginationOptions<T extends Command>(cmd: T, opts?: { limit?: boolean }) {
	if (opts?.limit === false) {
		return cmd
			.option('--offset <token>', 'Offset token returned by a previous paginated response')
			.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
	}
	return cmd
		.option('--limit <number>', 'Results per page, from 1 to 100 (default: 100)', parseLimit)
		.option('--offset <token>', 'Offset token returned by a previous paginated response')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.option('--all', 'Fetch all pages up to --max-pages')
		.option('--max-pages <number>', 'Maximum pages to fetch with --all (default: 10)', parseMaxPages)
}

export function paginationOptionsFromCli(opts: PaginationCliOptions): PaginationOptions {
	if (opts.all && opts.offset) throw new InvalidArgumentError('--all cannot be used with --offset')
	return {
		limit: opts.limit,
		offset: opts.offset,
		optFields: opts.optFields,
		fetchAll: opts.all,
		maxPages: opts.maxPages,
	}
}

export function itemsForOutput<T = any>(result: ListResult<T>) {
	return listItems(result)
}

export function printNextPageHint<T>(result: ListResult<T>) {
	const offset = nextPageOffset(result)
	if (offset) console.log(`\nNext offset: ${offset}`)
}

export function addGidOption<T extends Command>(
	cmd: T,
	baseName: string,
	description: string,
	opts?: { env?: string },
) {
	const normalizedOption = new Option(`--${baseName}-gid <gid>`, description)
	if (opts?.env) normalizedOption.env(opts.env)
	cmd.addOption(normalizedOption)
	cmd.addOption(new Option(`--${baseName} <gid>`, `${description} (legacy alias)`))

	return cmd
}

export function normalizedGid(opts: CliGidOptions, baseName: string) {
	const gidKey = `${baseName}Gid`
	const normalized = opts[gidKey]
	if (typeof normalized === 'string' && normalized.length > 0) return normalized
	const legacy = opts[baseName]
	if (typeof legacy === 'string' && legacy.length > 0) return legacy
	if (baseName === 'workspace') return envValue('ASANA_WORKSPACE')
	return undefined
}

export function requiredGid(opts: CliGidOptions, baseName: string, label: string) {
	const gid = normalizedGid(opts, baseName)
	if (!gid) throw new InvalidArgumentError(`${label} is required`)
	return gid
}
