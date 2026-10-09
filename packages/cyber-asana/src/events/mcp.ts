import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { EventApi } from './api.js'
import { getEvents } from './default.js'

function resolveEventApi(api?: EventApi | (() => EventApi)): EventApi {
	if (typeof api === 'function') return api()
	return api ?? { getEvents }
}

export function registerEventTools(server: McpServer, api?: EventApi | (() => EventApi)) {
	server.tool(
		'asana_event_list',
		'List changes to an Asana task, project, or goal since a sync token. Omit sync on the first call: the response then carries a fresh sync token, sync_reset: true, and no events. Pass the returned sync token back on the next call. When has_more is true, poll again immediately — Asana caps one token at 100 events.',
		{
			resource_gid: z.string().describe('Task, project, or goal GID to watch'),
			sync: z.string().optional().describe('Sync token from a previous response; omit on the first call'),
			opt_fields: z.string().optional().describe('Comma-separated optional Asana fields to include'),
		},
		async ({ resource_gid, sync, opt_fields }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveEventApi(api).getEvents(resource_gid, {
							...(sync !== undefined && { sync }),
							...(opt_fields !== undefined && { optFields: opt_fields }),
						}),
					),
				},
			],
		}),
	)
}
