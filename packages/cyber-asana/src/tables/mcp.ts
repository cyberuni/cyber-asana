import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import { ACCESS_LEVELS } from './access-level.js'
import type { TableApi } from './api.js'
import {
	addTableField,
	createTable,
	deleteTable,
	getTable,
	listTableFields,
	listTables,
	removeTableField,
	updateTable,
} from './default.js'

function resolveTableApi(api?: TableApi | (() => TableApi)): TableApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTables,
			getTable,
			createTable,
			updateTable,
			deleteTable,
			listTableFields,
			addTableField,
			removeTableField,
		}
	)
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

const accessLevel = z.enum(ACCESS_LEVELS)

export function registerTableTools(server: McpServer, api?: TableApi | (() => TableApi)) {
	server.tool(
		'asana_table_list',
		'List Asana Tables in a workspace (Advanced, Enterprise, or Enterprise+ plan)',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) =>
			json(await resolveTableApi(api).listTables(workspace_gid, paginationOptions(params))),
	)

	server.tool(
		'asana_table_get',
		'Get an Asana table by GID, including its custom field settings (columns)',
		{ table_gid: z.string().describe('Table GID'), ...readParams },
		async ({ table_gid, ...params }) => json(await resolveTableApi(api).getTable(table_gid, readOptions(params))),
	)

	server.tool(
		'asana_table_create',
		'Create an Asana table in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), name: z.string().describe('Table name'), ...readParams },
		async ({ workspace_gid, name, ...params }) =>
			json(await resolveTableApi(api).createTable(workspace_gid, name, readOptions(params))),
	)

	server.tool(
		'asana_table_update',
		'Update an Asana table: its name and default member access level',
		{
			table_gid: z.string().describe('Table GID'),
			name: z.string().optional().describe('New name'),
			default_access_level: accessLevel.optional().describe('Default access level for new members'),
			...readParams,
		},
		async ({ table_gid, name, default_access_level, ...params }) =>
			json(
				await resolveTableApi(api).updateTable(
					table_gid,
					{
						...(name !== undefined && { name }),
						...(default_access_level !== undefined && { default_access_level }),
					},
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_table_delete',
		'Delete an Asana table and its records',
		{ table_gid: z.string().describe('Table GID') },
		async ({ table_gid }) =>
			json(await deleteIdempotently('table', table_gid, () => resolveTableApi(api).deleteTable(table_gid))),
	)

	server.tool(
		'asana_table_fields_list',
		"List an Asana table's fields (custom field settings)",
		{ table_gid: z.string().describe('Table GID'), ...paginationParams },
		async ({ table_gid, ...params }) =>
			json(await resolveTableApi(api).listTableFields(table_gid, paginationOptions(params))),
	)

	server.tool(
		'asana_table_add_field',
		'Add a workspace-global custom field to an Asana table (up to 150 per table)',
		{
			table_gid: z.string().describe('Table GID'),
			custom_field_gid: z.string().describe('GID of a custom field that is global to the workspace'),
			is_important: z.boolean().optional().describe('Mark the field important to the table'),
			insert_before: z.string().optional().describe('Custom field setting GID to place the field before'),
			insert_after: z.string().optional().describe('Custom field setting GID to place the field after'),
			...readParams,
		},
		async ({ table_gid, custom_field_gid, is_important, insert_before, insert_after, ...params }) =>
			json(
				await resolveTableApi(api).addTableField(
					table_gid,
					custom_field_gid,
					{
						...(is_important !== undefined && { isImportant: is_important }),
						...(insert_before !== undefined && { insertBefore: insert_before }),
						...(insert_after !== undefined && { insertAfter: insert_after }),
					},
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_table_remove_field',
		'Remove a custom field from an Asana table',
		{ table_gid: z.string().describe('Table GID'), custom_field_gid: z.string().describe('Custom field GID') },
		async ({ table_gid, custom_field_gid }) => {
			await resolveTableApi(api).removeTableField(table_gid, custom_field_gid)
			return json({ removed: true, table: table_gid, custom_field: custom_field_gid })
		},
	)
}
