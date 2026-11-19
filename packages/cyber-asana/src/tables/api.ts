import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { AddTableFieldOptions, TableGateway, UpdateTableFields } from './gateway.js'

export type {
	AccessLevel,
	AddTableFieldOptions,
	Table,
	TableFieldSetting,
	UpdateTableFields,
} from './gateway.js'

export type TableApi = ReturnType<typeof createTableApi>

export function createTableApi(gateway: TableGateway) {
	return {
		listTables(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listTables(workspaceGid, opts)
		},
		getTable(tableGid: string, opts?: ReadOptions) {
			return gateway.getTable(tableGid, opts)
		},
		createTable(workspaceGid: string, name: string, opts?: ReadOptions) {
			return gateway.createTable(workspaceGid, name, opts)
		},
		updateTable(tableGid: string, fields: UpdateTableFields, opts?: ReadOptions) {
			return gateway.updateTable(tableGid, fields, opts)
		},
		deleteTable(tableGid: string) {
			return gateway.deleteTable(tableGid)
		},
		listTableFields(tableGid: string, opts?: PaginationOptions) {
			return gateway.listTableFields(tableGid, opts)
		},
		addTableField(tableGid: string, customFieldGid: string, opts?: AddTableFieldOptions, readOpts?: ReadOptions) {
			return gateway.addTableField(tableGid, customFieldGid, opts, readOpts)
		},
		removeTableField(tableGid: string, customFieldGid: string) {
			return gateway.removeTableField(tableGid, customFieldGid)
		},
	}
}
