import { createClient } from '../client.js'
import type { ReadOptions } from '../read-options.js'
import {
	createAsanaOooGateway,
	type OooEntryListOptions,
	type OooEntryWriteFields,
	type OooGateway,
} from './gateway.js'

export type OooApi = ReturnType<typeof createOooApi>

export function createOooApi(gateway: OooGateway) {
	return {
		listOooEntries(userGid: string, workspaceGid: string, opts?: OooEntryListOptions) {
			return gateway.listOooEntries(userGid, workspaceGid, opts)
		},
		getOooEntry(oooEntryGid: string, opts?: ReadOptions) {
			return gateway.getOooEntry(oooEntryGid, opts)
		},
		createOooEntry(userGid: string, workspaceGid: string, fields: { start_date: string; end_date: string }) {
			return gateway.createOooEntry(userGid, workspaceGid, fields)
		},
		updateOooEntry(oooEntryGid: string, fields: OooEntryWriteFields) {
			return gateway.updateOooEntry(oooEntryGid, fields)
		},
		deleteOooEntry(oooEntryGid: string) {
			return gateway.deleteOooEntry(oooEntryGid)
		},
	}
}

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
