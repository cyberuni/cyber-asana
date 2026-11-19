import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createTimeTrackingEntryApi } from './api.js'
import {
	createAsanaTimeTrackingEntryGateway,
	type TimeTrackingEntryFields,
	type TimeTrackingEntryFilters,
} from './gateway.js'

function defaultTimeTrackingEntryApi() {
	return createTimeTrackingEntryApi(createAsanaTimeTrackingEntryGateway(createClient()))
}

export async function listTimeTrackingEntries(filters?: TimeTrackingEntryFilters, opts?: PaginationOptions) {
	return defaultTimeTrackingEntryApi().listTimeTrackingEntries(filters, opts)
}

export async function listTimeTrackingEntriesForTask(taskGid: string, opts?: PaginationOptions) {
	return defaultTimeTrackingEntryApi().listTimeTrackingEntriesForTask(taskGid, opts)
}

export async function getTimeTrackingEntry(entryGid: string, opts?: ReadOptions) {
	return defaultTimeTrackingEntryApi().getTimeTrackingEntry(entryGid, opts)
}

export async function createTimeTrackingEntry(taskGid: string, fields: TimeTrackingEntryFields, opts?: ReadOptions) {
	return defaultTimeTrackingEntryApi().createTimeTrackingEntry(taskGid, fields, opts)
}

export async function updateTimeTrackingEntry(entryGid: string, fields: TimeTrackingEntryFields, opts?: ReadOptions) {
	return defaultTimeTrackingEntryApi().updateTimeTrackingEntry(entryGid, fields, opts)
}

export async function deleteTimeTrackingEntry(entryGid: string) {
	return defaultTimeTrackingEntryApi().deleteTimeTrackingEntry(entryGid)
}
