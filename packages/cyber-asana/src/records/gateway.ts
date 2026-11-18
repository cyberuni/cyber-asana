import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'
import type { AccessLevel } from '../tables/access-level.js'

/** A record (a row of a table) as Asana returns it. */
export type TableRecord = {
	gid: string
	name?: string
	resource_type?: string
	table?: { gid: string; name?: string } | null
	custom_fields?: { gid: string; name?: string; display_value?: string | null; [key: string]: unknown }[]
	permalink_url?: string
	created_at?: string
	modified_at?: string
	[key: string]: unknown
}

/**
 * Custom field values keyed by custom field GID. A value is an enum option GID, a string, a number, or an
 * object, by field type; dates are `YYYY-MM-DD` and date-times ISO 8601 UTC. Only fields already on the
 * record's table can be written.
 */
export type RecordCustomFields = Record<string, unknown>

/** Options of record creation. */
export type CreateRecordOptions = {
	customFields?: RecordCustomFields
	/** A second record with the same fingerprint in the same table fails with 409 instead of duplicating. */
	uniqueFingerprint?: string
}

/** Fields Asana accepts on a record update, from developers.asana.com (`RecordItemUpdateRequest`). */
export type UpdateRecordFields = {
	name?: string
	custom_fields?: RecordCustomFields
	default_access_level?: AccessLevel
}

/** Filters of `GET /tables/{gid}/records`. Asana accepts only `created_at` for `sort_by` here. */
export type RecordListFilters = {
	/** ISO 8601 date-time; only records modified since. */
	modifiedSince?: string
	sortBy?: 'created_at'
}

/**
 * Filters of the workspace record search (paid plan; 402 otherwise). Results are not stable and the
 * index lags writes by 10 to 60 seconds, so use `listRecords` to read your own write.
 */
export type RecordSearchFilters = {
	text?: string
	tablesAny?: string[]
	tablesAll?: string[]
	tablesNot?: string[]
	teamsAny?: string[]
	/** User GIDs, emails, or `me`. */
	followersAny?: string[]
	followersNot?: string[]
	createdOn?: string
	createdOnBefore?: string
	createdOnAfter?: string
	createdAtBefore?: string
	createdAtAfter?: string
	sortBy?: 'created_at' | 'modified_at'
	sortAscending?: boolean
}

/**
 * Search is a single capped page, like typeahead: `offset` and `fetchAll` have nothing to bind to,
 * since the reference documents `limit` only.
 */
export type RecordSearchOptions = {
	limit?: number
	optFields?: string
}

/** Filters of a record's stories. */
export type RecordStoryFilters = {
	/** ISO 8601 date-time; exclusive, second granularity. */
	createdAfter?: string
	/** Only comments (`resource_subtype=comment_added`), the one subtype Asana supports. */
	commentsOnly?: boolean
	sortAscending?: boolean
}

/** Asana creates only comment stories on a record. */
export type RecordStoryFields = {
	text?: string
	html_text?: string
}

export type RecordGateway = {
	listRecords(tableGid: string, filters?: RecordListFilters, opts?: PaginationOptions): Promise<ListResult<TableRecord>>
	searchRecords(workspaceGid: string, filters?: RecordSearchFilters, opts?: RecordSearchOptions): Promise<TableRecord[]>
	getRecord(recordGid: string, opts?: ReadOptions): Promise<TableRecord>
	createRecord(tableGid: string, name: string, opts?: CreateRecordOptions): Promise<TableRecord>
	updateRecord(recordGid: string, fields: UpdateRecordFields): Promise<TableRecord>
	deleteRecord(recordGid: string): Promise<void>
	listRecordStories(
		recordGid: string,
		filters?: RecordStoryFilters,
		opts?: PaginationOptions,
	): Promise<ListResult<Asana.Story>>
	createRecordStory(recordGid: string, fields: RecordStoryFields): Promise<Asana.Story>
}

const list = (values?: string[]) => (values && values.length > 0 ? values.join(',') : undefined)

/** Drops unset keys so the SDK sends only what the caller chose. */
function defined<T extends Record<string, unknown>>(params: T): Partial<T> {
	return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined)) as Partial<T>
}

export function createAsanaRecordGateway(client: Asana.ApiClient): RecordGateway {
	const recordsApi = new Asana.RecordsApi(client)
	const storiesApi = new Asana.StoriesApi(client)

	return {
		async listRecords(tableGid, filters, opts) {
			const res = await recordsApi.getRecordsForTable(tableGid, {
				...toAsanaPaginationOptions(opts),
				...defined({ modified_since: filters?.modifiedSince, sort_by: filters?.sortBy }),
			})
			return await collectListResponse(res, opts)
		},
		async searchRecords(workspaceGid, filters, opts) {
			const res = await recordsApi.searchRecordsForWorkspace(workspaceGid, {
				...toAsanaPaginationOptions({ limit: opts?.limit, optFields: opts?.optFields }),
				...defined({
					text: filters?.text,
					'tables.any': list(filters?.tablesAny),
					'tables.not': list(filters?.tablesNot),
					'tables.all': list(filters?.tablesAll),
					'teams.any': list(filters?.teamsAny),
					'followers.any': list(filters?.followersAny),
					'followers.not': list(filters?.followersNot),
					created_on: filters?.createdOn,
					'created_on.before': filters?.createdOnBefore,
					'created_on.after': filters?.createdOnAfter,
					'created_at.before': filters?.createdAtBefore,
					'created_at.after': filters?.createdAtAfter,
					sort_by: filters?.sortBy,
					sort_ascending: filters?.sortAscending,
				}),
			})
			return res.data ?? []
		},
		async getRecord(recordGid, opts) {
			const res = await recordsApi.getRecord(recordGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createRecord(tableGid, name, opts) {
			const res = await recordsApi.createRecord(
				{
					data: {
						name,
						table: tableGid,
						...(opts?.customFields !== undefined && { custom_fields: opts.customFields }),
						...(opts?.uniqueFingerprint !== undefined && { unique_fingerprint: opts.uniqueFingerprint }),
					},
				},
				{},
			)
			return res.data
		},
		async updateRecord(recordGid, fields) {
			const res = await recordsApi.updateRecord({ data: fields }, recordGid, {})
			return res.data
		},
		async deleteRecord(recordGid) {
			await recordsApi.deleteRecord(recordGid)
		},
		async listRecordStories(recordGid, filters, opts) {
			const res = await storiesApi.getStoriesForRecord(recordGid, {
				...toAsanaPaginationOptions(opts),
				...defined({
					created_after: filters?.createdAfter,
					resource_subtype: filters?.commentsOnly ? 'comment_added' : undefined,
					sort_ascending: filters?.sortAscending,
				}),
			})
			return await collectListResponse(res, opts)
		},
		async createRecordStory(recordGid, fields) {
			const res = await storiesApi.createStoryForRecord({ data: fields }, recordGid, {})
			return res.data
		},
	}
}
