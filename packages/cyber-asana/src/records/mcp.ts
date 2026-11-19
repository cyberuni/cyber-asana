import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import { STICKER_NAMES } from '../stories/write-options.js'
import { ACCESS_LEVELS } from '../tables/access-level.js'
import type { RecordApi, RecordSearchFilters } from './api.js'
import {
	createRecord,
	createRecordStory,
	deleteRecord,
	getRecord,
	listRecordStories,
	listRecords,
	searchRecords,
	updateRecord,
} from './default.js'

function resolveRecordApi(api?: RecordApi | (() => RecordApi)): RecordApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listRecords,
			searchRecords,
			getRecord,
			createRecord,
			updateRecord,
			deleteRecord,
			listRecordStories,
			createRecordStory,
		}
	)
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

const customFields = z
	.record(z.string(), z.unknown())
	.describe(
		'Custom field values keyed by custom field GID: an enum option GID, string, number, or object by field type; dates as YYYY-MM-DD. Only fields already on the table can be written.',
	)

export function registerRecordTools(server: McpServer, api?: RecordApi | (() => RecordApi)) {
	server.tool(
		'asana_record_list',
		'List the records (rows) of an Asana table',
		{
			table_gid: z.string().describe('Table GID'),
			sort_by: z.enum(['created_at']).optional().describe('Sort order; Asana accepts only created_at here'),
			modified_since: z.string().optional().describe('Only records modified since this ISO 8601 date-time'),
			...paginationParams,
		},
		async ({ table_gid, sort_by, modified_since, ...params }) =>
			json(
				await resolveRecordApi(api).listRecords(
					table_gid,
					{
						...(sort_by !== undefined && { sortBy: sort_by }),
						...(modified_since !== undefined && { modifiedSince: modified_since }),
					},
					paginationOptions(params),
				),
			),
	)

	server.tool(
		'asana_record_search',
		'Search records across the tables of a workspace (paid plan; one unstable page; the index lags writes by 10 to 60 seconds, so use asana_record_list to read your own write)',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			text: z.string().optional().describe('Full-text search on the record name'),
			tables_any: z.array(z.string()).optional().describe('Only records in any of these table GIDs'),
			tables_all: z.array(z.string()).optional().describe('Only records in all of these table GIDs'),
			tables_not: z.array(z.string()).optional().describe('Skip records in these table GIDs'),
			teams_any: z.array(z.string()).optional().describe('Only records of these team GIDs'),
			followers_any: z.array(z.string()).optional().describe('Followed by any of these users (GID, email, or me)'),
			followers_not: z.array(z.string()).optional().describe('Not followed by these users (GID, email, or me)'),
			created_on: z.string().optional().describe('Created on this date (YYYY-MM-DD)'),
			created_on_before: z.string().optional().describe('Created before this date (YYYY-MM-DD)'),
			created_on_after: z.string().optional().describe('Created after this date (YYYY-MM-DD)'),
			created_at_before: z.string().optional().describe('Created before this ISO 8601 date-time'),
			created_at_after: z.string().optional().describe('Created after this ISO 8601 date-time'),
			sort_by: z.enum(['created_at', 'modified_at']).optional().describe('Sort field; Asana defaults to modified_at'),
			sort_ascending: z.boolean().optional().describe('Oldest first; Asana defaults to false'),
			limit: paginationParams.limit,
			opt_fields: paginationParams.opt_fields,
		},
		async ({ workspace_gid, limit, opt_fields, ...f }) => {
			const filters: RecordSearchFilters = {
				...(f.text !== undefined && { text: f.text }),
				...(f.tables_any !== undefined && { tablesAny: f.tables_any }),
				...(f.tables_all !== undefined && { tablesAll: f.tables_all }),
				...(f.tables_not !== undefined && { tablesNot: f.tables_not }),
				...(f.teams_any !== undefined && { teamsAny: f.teams_any }),
				...(f.followers_any !== undefined && { followersAny: f.followers_any }),
				...(f.followers_not !== undefined && { followersNot: f.followers_not }),
				...(f.created_on !== undefined && { createdOn: f.created_on }),
				...(f.created_on_before !== undefined && { createdOnBefore: f.created_on_before }),
				...(f.created_on_after !== undefined && { createdOnAfter: f.created_on_after }),
				...(f.created_at_before !== undefined && { createdAtBefore: f.created_at_before }),
				...(f.created_at_after !== undefined && { createdAtAfter: f.created_at_after }),
				...(f.sort_by !== undefined && { sortBy: f.sort_by }),
				...(f.sort_ascending !== undefined && { sortAscending: f.sort_ascending }),
			}
			return json(await resolveRecordApi(api).searchRecords(workspace_gid, filters, { limit, optFields: opt_fields }))
		},
	)

	server.tool(
		'asana_record_get',
		'Get an Asana record by GID; pass opt_fields custom_fields.name,custom_fields.display_value for its field values',
		{ record_gid: z.string().describe('Record GID'), ...readParams },
		async ({ record_gid, ...params }) => json(await resolveRecordApi(api).getRecord(record_gid, readOptions(params))),
	)

	server.tool(
		'asana_record_create',
		'Create a record in an Asana table',
		{
			table_gid: z.string().describe('Table GID'),
			name: z.string().describe('Record name'),
			custom_fields: customFields.optional(),
			unique_fingerprint: z
				.string()
				.optional()
				.describe(
					'Client-chosen identifier: a duplicate in the same table fails with 409 instead of creating a second record',
				),
			default_access_level: z.enum(ACCESS_LEVELS).optional().describe('Default access level for new members'),
			...readParams,
		},
		async ({ table_gid, name, custom_fields, unique_fingerprint, default_access_level, ...params }) =>
			json(
				await resolveRecordApi(api).createRecord(
					table_gid,
					name,
					{
						...(custom_fields !== undefined && { customFields: custom_fields }),
						...(unique_fingerprint !== undefined && { uniqueFingerprint: unique_fingerprint }),
						...(default_access_level !== undefined && { defaultAccessLevel: default_access_level }),
					},
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_record_update',
		'Update an Asana record: name, custom field values, default member access level',
		{
			record_gid: z.string().describe('Record GID'),
			name: z.string().optional().describe('New name'),
			custom_fields: customFields.optional(),
			default_access_level: z.enum(ACCESS_LEVELS).optional().describe('Default access level for new members'),
			...readParams,
		},
		async ({ record_gid, name, custom_fields, default_access_level, ...params }) =>
			json(
				await resolveRecordApi(api).updateRecord(
					record_gid,
					{
						...(name !== undefined && { name }),
						...(custom_fields !== undefined && { custom_fields }),
						...(default_access_level !== undefined && { default_access_level }),
					},
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_record_delete',
		'Delete an Asana record',
		{ record_gid: z.string().describe('Record GID') },
		async ({ record_gid }) =>
			json(await deleteIdempotently('record', record_gid, () => resolveRecordApi(api).deleteRecord(record_gid))),
	)

	server.tool(
		'asana_record_story_list',
		"List an Asana record's stories (comments and activity)",
		{
			record_gid: z.string().describe('Record GID'),
			comments_only: z.boolean().optional().describe('Only comments, not activity'),
			created_after: z.string().optional().describe('Only stories created after this ISO 8601 date-time (exclusive)'),
			sort_ascending: z.boolean().optional().describe('Oldest first (the default) when true, newest first when false'),
			...paginationParams,
		},
		async ({ record_gid, comments_only, created_after, sort_ascending, ...params }) =>
			json(
				await resolveRecordApi(api).listRecordStories(
					record_gid,
					{
						...(comments_only !== undefined && { commentsOnly: comments_only }),
						...(created_after !== undefined && { createdAfter: created_after }),
						...(sort_ascending !== undefined && { sortAscending: sort_ascending }),
					},
					paginationOptions(params),
				),
			),
	)

	server.tool(
		'asana_record_story_create',
		'Add a comment to an Asana record (Asana allows only comment stories here)',
		{
			record_gid: z.string().describe('Record GID'),
			text: z.string().optional().describe('Comment text'),
			html_text: z.string().optional().describe('Comment as Asana rich text HTML'),
			is_pinned: z.boolean().optional().describe('Pin the new comment on the record'),
			sticker_name: z.enum(STICKER_NAMES).optional().describe('Sticker to attach to the comment'),
			...readParams,
		},
		async ({ record_gid, text, html_text, is_pinned, sticker_name, ...params }) =>
			json(
				await resolveRecordApi(api).createRecordStory(
					record_gid,
					{
						...(text !== undefined && { text }),
						...(html_text !== undefined && { html_text }),
						...(is_pinned !== undefined && { is_pinned }),
						...(sticker_name !== undefined && { sticker_name }),
					},
					readOptions(params),
				),
			),
	)
}
