import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** A time tracking entry as Asana returns it, as far as cyber-asana reads it. */
export type TimeTrackingEntry = {
	gid: string
	duration_minutes?: number
	entered_on?: string
	created_by?: { gid?: string; name?: string } | null
	task?: { gid?: string; name?: string } | null
	[key: string]: unknown
}

/**
 * Request-body fields from developers.asana.com; unverified against a live paid workspace. Categories,
 * timesheets, rates, and budgets are out of scope.
 */
export type TimeTrackingEntryFields = {
	durationMinutes?: number
	/** `YYYY-MM-DD`; Asana defaults to today. */
	enteredOn?: string
	/**
	 * User GID the logged time is attributed to; Asana defaults to the caller. Another user is accepted only
	 * when the caller is that user's time reviewer or an admin.
	 */
	assignee?: string
	/** Project GID the time is attributed to. */
	attributableTo?: string
}

/** The filters of the workspace-wide list; every one is optional and maps to a query parameter. */
export type TimeTrackingEntryFilters = {
	task?: string
	/** User GID the logged time is attributed to. */
	assignee?: string
	/** @deprecated Asana deprecated its `user` query parameter for `assignee`; this is sent as `assignee`. */
	user?: string
	/** Project GID the time is attributed to. */
	attributableTo?: string
	portfolio?: string
	workspace?: string
	enteredOnStart?: string
	enteredOnEnd?: string
}

export type TimeTrackingEntryGateway = {
	listTimeTrackingEntries(
		filters?: TimeTrackingEntryFilters,
		opts?: PaginationOptions,
	): Promise<ListResult<TimeTrackingEntry>>
	listTimeTrackingEntriesForTask(taskGid: string, opts?: PaginationOptions): Promise<ListResult<TimeTrackingEntry>>
	getTimeTrackingEntry(entryGid: string, opts?: ReadOptions): Promise<TimeTrackingEntry>
	createTimeTrackingEntry(
		taskGid: string,
		fields: TimeTrackingEntryFields,
		opts?: ReadOptions,
	): Promise<TimeTrackingEntry>
	updateTimeTrackingEntry(
		entryGid: string,
		fields: TimeTrackingEntryFields,
		opts?: ReadOptions,
	): Promise<TimeTrackingEntry>
	deleteTimeTrackingEntry(entryGid: string): Promise<void>
}

function bodyOf(fields: TimeTrackingEntryFields) {
	return {
		data: {
			...(fields.durationMinutes !== undefined && { duration_minutes: fields.durationMinutes }),
			...(fields.enteredOn !== undefined && { entered_on: fields.enteredOn }),
			...(fields.assignee !== undefined && { assignee: fields.assignee }),
			...(fields.attributableTo !== undefined && { attributable_to: fields.attributableTo }),
		},
	}
}

export function createAsanaTimeTrackingEntryGateway(client: Asana.ApiClient): TimeTrackingEntryGateway {
	const entriesApi = new Asana.TimeTrackingEntriesApi(client)

	return {
		async listTimeTrackingEntries(filters, opts) {
			const assignee = filters?.assignee ?? filters?.user
			const res = await entriesApi.getTimeTrackingEntries({
				...(filters?.task !== undefined && { task: filters.task }),
				...(assignee !== undefined && { assignee }),
				...(filters?.attributableTo !== undefined && { attributable_to: filters.attributableTo }),
				...(filters?.portfolio !== undefined && { portfolio: filters.portfolio }),
				...(filters?.workspace !== undefined && { workspace: filters.workspace }),
				...(filters?.enteredOnStart !== undefined && { entered_on_start_date: filters.enteredOnStart }),
				...(filters?.enteredOnEnd !== undefined && { entered_on_end_date: filters.enteredOnEnd }),
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async listTimeTrackingEntriesForTask(taskGid, opts) {
			const res = await entriesApi.getTimeTrackingEntriesForTask(taskGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getTimeTrackingEntry(entryGid, opts) {
			const res = await entriesApi.getTimeTrackingEntry(entryGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createTimeTrackingEntry(taskGid, fields, opts) {
			const res = await entriesApi.createTimeTrackingEntry(bodyOf(fields), taskGid, toAsanaReadOptions(opts))
			return res.data
		},
		async updateTimeTrackingEntry(entryGid, fields, opts) {
			const res = await entriesApi.updateTimeTrackingEntry(bodyOf(fields), entryGid, toAsanaReadOptions(opts))
			return res.data
		},
		async deleteTimeTrackingEntry(entryGid) {
			await entriesApi.deleteTimeTrackingEntry(entryGid)
		},
	}
}
