import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { MAX_CATEGORIES } from './billing.js'
import type { TimeTrackingEntryFields, TimeTrackingEntryFilters, TimeTrackingEntryGateway } from './gateway.js'

export type { TimeTrackingEntryFields, TimeTrackingEntryFilters } from './gateway.js'

export type TimeTrackingEntryApi = ReturnType<typeof createTimeTrackingEntryApi>

function checkCategories(fields: TimeTrackingEntryFields) {
	if ((fields.categories?.length ?? 0) > MAX_CATEGORIES) {
		throw new Error(`Give at most one time tracking category; Asana allows ${MAX_CATEGORIES} per entry`)
	}
}

export function createTimeTrackingEntryApi(gateway: TimeTrackingEntryGateway) {
	return {
		listTimeTrackingEntries(filters?: TimeTrackingEntryFilters, opts?: PaginationOptions) {
			return gateway.listTimeTrackingEntries(filters, opts)
		},
		listTimeTrackingEntriesForTask(taskGid: string, opts?: PaginationOptions) {
			return gateway.listTimeTrackingEntriesForTask(taskGid, opts)
		},
		getTimeTrackingEntry(entryGid: string, opts?: ReadOptions) {
			return gateway.getTimeTrackingEntry(entryGid, opts)
		},
		createTimeTrackingEntry(taskGid: string, fields: TimeTrackingEntryFields, opts?: ReadOptions) {
			checkCategories(fields)
			return gateway.createTimeTrackingEntry(taskGid, fields, opts)
		},
		updateTimeTrackingEntry(entryGid: string, fields: TimeTrackingEntryFields, opts?: ReadOptions) {
			checkCategories(fields)
			return gateway.updateTimeTrackingEntry(entryGid, fields, opts)
		},
		deleteTimeTrackingEntry(entryGid: string) {
			return gateway.deleteTimeTrackingEntry(entryGid)
		},
	}
}
