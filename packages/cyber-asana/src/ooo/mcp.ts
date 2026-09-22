import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../mcp-options.js'
import type { OooApi } from './api.js'
import { createOooEntry, deleteOooEntry, getOooEntry, listOooEntries, updateOooEntry } from './api.js'

function resolveOooApi(api?: OooApi | (() => OooApi)): OooApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listOooEntries,
			getOooEntry,
			createOooEntry,
			updateOooEntry,
			deleteOooEntry,
		}
	)
}

const userGidParam = z
	.string()
	.optional()
	.describe('User GID whose out-of-office entries to read (default: the authenticated user)')

export function registerOooTools(server: McpServer, api?: OooApi | (() => OooApi)) {
	server.tool(
		'asana_ooo_list',
		'List Asana out-of-office entries for a user — check whether someone is away before assigning work',
		{
			user_gid: userGidParam,
			workspace_gid: z.string().describe('Workspace GID'),
			start_date: z
				.string()
				.optional()
				.describe('Only entries overlapping with or ending after this date (YYYY-MM-DD)'),
			end_date: z
				.string()
				.optional()
				.describe('Only entries overlapping with or starting before this date (YYYY-MM-DD)'),
			...paginationParams,
		},
		async ({ user_gid, workspace_gid, start_date, end_date, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveOooApi(api).listOooEntries(user_gid ?? 'me', workspace_gid, {
							...paginationOptions(params),
							...(start_date !== undefined && { startDate: start_date }),
							...(end_date !== undefined && { endDate: end_date }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_ooo_get',
		'Get an Asana out-of-office entry by GID',
		{ ooo_entry_gid: z.string().describe('OOO entry GID'), ...readParams },
		async ({ ooo_entry_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveOooApi(api).getOooEntry(ooo_entry_gid, readOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_ooo_create',
		'Create an Asana out-of-office entry',
		{
			user_gid: z.string().optional().describe('User GID who is out of office (default: the authenticated user)'),
			workspace_gid: z.string().describe('Workspace GID'),
			start_date: z.string().describe('First day out of office (YYYY-MM-DD)'),
			end_date: z.string().describe('Last day out of office (YYYY-MM-DD)'),
		},
		async ({ user_gid, workspace_gid, start_date, end_date }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveOooApi(api).createOooEntry(user_gid ?? 'me', workspace_gid, { start_date, end_date }),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_ooo_update',
		'Update an Asana out-of-office entry',
		{
			ooo_entry_gid: z.string().describe('OOO entry GID'),
			start_date: z.string().optional().describe('New first day out of office (YYYY-MM-DD)'),
			end_date: z.string().optional().describe('New last day out of office (YYYY-MM-DD)'),
		},
		async ({ ooo_entry_gid, start_date, end_date }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveOooApi(api).updateOooEntry(ooo_entry_gid, {
							...(start_date !== undefined && { start_date }),
							...(end_date !== undefined && { end_date }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_ooo_delete',
		'Delete an Asana out-of-office entry',
		{ ooo_entry_gid: z.string().describe('OOO entry GID') },
		async ({ ooo_entry_gid }) => {
			await resolveOooApi(api).deleteOooEntry(ooo_entry_gid)
			return { content: [{ type: 'text', text: JSON.stringify({ ok: true, deleted: ooo_entry_gid }) }] }
		},
	)
}
