import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import type { StatusApi } from './api.js'
import { createStatus, deleteStatus, getStatus, listStatuses } from './api.js'

function resolveStatusApi(api?: StatusApi | (() => StatusApi)): StatusApi {
	if (typeof api === 'function') return api()
	return api ?? { listStatuses, getStatus, createStatus, deleteStatus }
}

export function registerStatusTools(server: McpServer, api?: StatusApi | (() => StatusApi)) {
	server.tool(
		'asana_status_list',
		'List status updates for an Asana project, portfolio, or goal',
		{
			parent_gid: z.string().describe('Parent GID (project, portfolio, or goal)'),
			...paginationParams,
		},
		async ({ parent_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveStatusApi(api).listStatuses(parent_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_status_get',
		'Get an Asana status update by GID',
		{ status_gid: z.string().describe('Status update GID') },
		async ({ status_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveStatusApi(api).getStatus(status_gid)) }],
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
