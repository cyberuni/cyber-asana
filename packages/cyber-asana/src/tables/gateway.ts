import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'
import type { AccessLevel } from './access-level.js'

export type { AccessLevel } from './access-level.js'

/** A table as Asana returns it; `custom_field_settings` is its column definition. */
export type Table = {
	gid: string
	name?: string
	resource_type?: string
	workspace?: { gid: string; name?: string }
	default_access_level?: AccessLevel
	custom_field_settings?: TableFieldSetting[]
	permalink_url?: string
	[key: string]: unknown
}

/** One column of a table: a custom field applied to it. */
export type TableFieldSetting = {
	gid: string
	resource_type?: string
	custom_field?: { gid: string; name?: string; resource_subtype?: string }
	is_important?: boolean
	[key: string]: unknown
}

/** Fields Asana accepts on a table update, from developers.asana.com (`TableUpdateRequest`). */
export type UpdateTableFields = {
	name?: string
	default_access_level?: AccessLevel
}

/** Options of `addCustomFieldSetting`; `insertBefore` and `insertAfter` are exclusive. */
export type AddTableFieldOptions = {
	isImportant?: boolean
	insertBefore?: string
	insertAfter?: string
}

export type TableGateway = {
	listTables(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<Table>>
	getTable(tableGid: string, opts?: ReadOptions): Promise<Table>
	createTable(workspaceGid: string, name: string, opts?: ReadOptions): Promise<Table>
	updateTable(tableGid: string, fields: UpdateTableFields, opts?: ReadOptions): Promise<Table>
	deleteTable(tableGid: string): Promise<void>
	listTableFields(tableGid: string, opts?: PaginationOptions): Promise<ListResult<TableFieldSetting>>
	addTableField(
		tableGid: string,
		customFieldGid: string,
		opts?: AddTableFieldOptions,
		readOpts?: ReadOptions,
	): Promise<TableFieldSetting>
	removeTableField(tableGid: string, customFieldGid: string): Promise<void>
}

export function createAsanaTableGateway(client: Asana.ApiClient): TableGateway {
	const tablesApi = new Asana.TablesApi(client)

	return {
		async listTables(workspaceGid, opts) {
			const res = await tablesApi.getTablesForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getTable(tableGid, opts) {
			const res = await tablesApi.getTable(tableGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createTable(workspaceGid, name, opts) {
			const res = await tablesApi.createTable({ data: { name, workspace: workspaceGid } }, toAsanaReadOptions(opts))
			return res.data
		},
		async updateTable(tableGid, fields, opts) {
			const res = await tablesApi.updateTable({ data: fields }, tableGid, toAsanaReadOptions(opts))
			return res.data
		},
		async deleteTable(tableGid) {
			await tablesApi.deleteTable(tableGid)
		},
		async listTableFields(tableGid, opts) {
			const res = await tablesApi.getCustomFieldSettingsForTable(tableGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async addTableField(tableGid, customFieldGid, opts, readOpts) {
			const res = await tablesApi.addCustomFieldSettingForTable(
				{
					data: {
						custom_field: customFieldGid,
						...(opts?.isImportant !== undefined && { is_important: opts.isImportant }),
						...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
					},
				},
				tableGid,
				toAsanaReadOptions(readOpts),
			)
			return res.data
		},
		async removeTableField(tableGid, customFieldGid) {
			await tablesApi.removeCustomFieldSettingForTable({ data: { custom_field: customFieldGid } }, tableGid)
		},
	}
}
