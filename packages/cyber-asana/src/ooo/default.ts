import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createOooApi } from './api.js'
import { createAsanaOooGateway, type OooEntryListOptions, type OooEntryWriteFields } from './gateway.js'

function defaultOooApi() {
	return createOooApi(createAsanaOooGateway(createClient()))
}

export async function listOooEntries(userGid: string, workspaceGid: string, opts?: OooEntryListOptions) {
	return defaultOooApi().listOooEntries(userGid, workspaceGid, opts)
}

export async function getOooEntry(oooEntryGid: string, opts?: ReadOptions) {
	return defaultOooApi().getOooEntry(oooEntryGid, opts)
}

export async function createOooEntry(
	userGid: string,
	workspaceGid: string,
	fields: { start_date: string; end_date: string },
) {
	return defaultOooApi().createOooEntry(userGid, workspaceGid, fields)
}

export async function updateOooEntry(oooEntryGid: string, fields: OooEntryWriteFields) {
	return defaultOooApi().updateOooEntry(oooEntryGid, fields)
}

export async function deleteOooEntry(oooEntryGid: string) {
	return defaultOooApi().deleteOooEntry(oooEntryGid)
}
