import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaStatusGateway, type StatusCreateFields, type StatusGateway } from './gateway.js'

export type StatusApi = ReturnType<typeof createStatusApi>

export function createStatusApi(gateway: StatusGateway) {
	return {
		listStatuses(parentGid: string, opts?: PaginationOptions) {
			return gateway.listStatuses(parentGid, opts)
		},
		getStatus(statusGid: string) {
			return gateway.getStatus(statusGid)
		},
		createStatus(parentGid: string, fields: StatusCreateFields) {
			return gateway.createStatus(parentGid, fields)
		},
		deleteStatus(statusGid: string) {
			return gateway.deleteStatus(statusGid)
		},
	}
}

function defaultStatusApi() {
	return createStatusApi(createAsanaStatusGateway(createClient()))
}

export async function listStatuses(parentGid: string, opts?: PaginationOptions) {
	return defaultStatusApi().listStatuses(parentGid, opts)
}

export async function getStatus(statusGid: string) {
	return defaultStatusApi().getStatus(statusGid)
}

export async function createStatus(parentGid: string, fields: StatusCreateFields) {
	return defaultStatusApi().createStatus(parentGid, fields)
}

export async function deleteStatus(statusGid: string) {
	return defaultStatusApi().deleteStatus(statusGid)
}
