import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { TimeTrackingEntryFields, TimeTrackingEntryFilters, TimeTrackingEntryGateway } from './gateway.js'

export type { TimeTrackingEntryFields, TimeTrackingEntryFilters } from './gateway.js'

export type TimeTrackingEntryApi = ReturnType<typeof createTimeTrackingEntryApi>

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
		createTimeTrackingEntry(taskGid: string, fields: TimeTrackingEntryFields) {
			return gateway.createTimeTrackingEntry(taskGid, fields)
		},
		updateTimeTrackingEntry(entryGid: string, fields: TimeTrackingEntryFields) {
			return gateway.updateTimeTrackingEntry(entryGid, fields)
		},
		deleteTimeTrackingEntry(entryGid: string) {
			return gateway.deleteTimeTrackingEntry(entryGid)
		},
	}
}
