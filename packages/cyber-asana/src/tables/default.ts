import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createTableApi } from './api.js'
import { type AddTableFieldOptions, createAsanaTableGateway, type UpdateTableFields } from './gateway.js'

function defaultTableApi() {
	return createTableApi(createAsanaTableGateway(createClient()))
}

export async function listTables(workspaceGid: string, opts?: PaginationOptions) {
	return defaultTableApi().listTables(workspaceGid, opts)
}

export async function getTable(tableGid: string, opts?: ReadOptions) {
	return defaultTableApi().getTable(tableGid, opts)
}

export async function createTable(workspaceGid: string, name: string, opts?: ReadOptions) {
	return defaultTableApi().createTable(workspaceGid, name, opts)
}

export async function updateTable(tableGid: string, fields: UpdateTableFields, opts?: ReadOptions) {
	return defaultTableApi().updateTable(tableGid, fields, opts)
}

export async function deleteTable(tableGid: string) {
	return defaultTableApi().deleteTable(tableGid)
}

export async function listTableFields(tableGid: string, opts?: PaginationOptions) {
	return defaultTableApi().listTableFields(tableGid, opts)
}

export async function addTableField(
	tableGid: string,
	customFieldGid: string,
	opts?: AddTableFieldOptions,
	readOpts?: ReadOptions,
) {
	return defaultTableApi().addTableField(tableGid, customFieldGid, opts, readOpts)
}

export async function removeTableField(tableGid: string, customFieldGid: string) {
	return defaultTableApi().removeTableField(tableGid, customFieldGid)
}
