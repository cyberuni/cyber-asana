import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../mcp-options.js'
import type { StatusApi } from './api.js'
import { createStatus, deleteStatus, getStatus, getStatusOverview, listStatuses } from './api.js'

function resolveStatusApi(api?: StatusApi | (() => StatusApi)): StatusApi {
	if (typeof api === 'function') return api()
	return api ?? { listStatuses, getStatus, createStatus, deleteStatus, getStatusOverview }
}

export function registerStatusTools(server: McpServer, api?: StatusApi | (() => StatusApi)) {
	server.tool(
		'asana_status_list',
		'List status updates for an Asana project, portfolio, or goal',
		{
			parent_gid: z.string().describe('Parent GID (project, portfolio, or goal)'),
			created_since: z.string().optional().describe('Only status updates created since this ISO 8601 timestamp'),
			...paginationParams,
		},
		async ({ parent_gid, created_since, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveStatusApi(api).listStatuses(parent_gid, {
							...paginationOptions(params),
							...(created_since !== undefined && { createdSince: created_since }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_status_overview',
		'Roll up the latest status update and task counts for an Asana project or portfolio in one call. ' +
			'Deterministic and parent-scoped — it takes a GID and does not search. For a portfolio it returns one entry ' +
			'per item, capped by `limit` (default 25) with `truncated` set when the portfolio holds more.',
		{
			parent_gid: z.string().describe('Parent GID (project or portfolio)'),
			limit: z.number().int().min(1).max(100).optional().describe('Portfolio items to roll up (default 25)'),
			parent_type: z
				.enum(['project', 'portfolio'])
				.optional()
				.describe('Skip parent-type detection and save one API call'),
		},
		async ({ parent_gid, limit, parent_type }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveStatusApi(api).getStatusOverview(parent_gid, {
							...(limit !== undefined && { limit }),
							...(parent_type !== undefined && { parentType: parent_type }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_status_get',
		'Get an Asana status update by GID',
		{ status_gid: z.string().describe('Status update GID'), ...readParams },
		async ({ status_gid, ...params }) => ({
			content: [
				{ type: 'text', text: JSON.stringify(await resolveStatusApi(api).getStatus(status_gid, readOptions(params))) },
			],
		}),
	)

	server.tool(
		'asana_status_create',
		'Create a status update on an Asana project, portfolio, or goal',
		{
			parent_gid: z.string().describe('Parent GID (project, portfolio, or goal)'),
			status_type: z.string().describe('Status type (e.g. on_track, at_risk, off_track, on_hold, complete)'),
			text: z.string().optional().describe('Status update body as plain text'),
			html_text: z.string().optional().describe('Status update body as Asana rich text HTML'),
			title: z.string().optional().describe('Status update title'),
		},
		async ({ parent_gid, status_type, text, html_text, title }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveStatusApi(api).createStatus(parent_gid, {
							status_type,
							...(text !== undefined && { text }),
							...(html_text !== undefined && { html_text }),
							...(title !== undefined && { title }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_status_delete',
		'Delete an Asana status update',
		{ status_gid: z.string().describe('Status update GID') },
		async ({ status_gid }) => {
			await resolveStatusApi(api).deleteStatus(status_gid)
			return { content: [{ type: 'text', text: `Deleted status update ${status_gid}` }] }
		},
	)
}
