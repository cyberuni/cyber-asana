import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type StatusCreateFields = {
	status_type: string
	text?: string
	html_text?: string
	title?: string
}

/**
 * Options for the status listing. `createdSince` is Asana's own filter on the
 * endpoint — a timestamp that trims the history to updates posted after it,
 * which is what "what changed since the last check-in?" asks for.
 */
export type StatusListOptions = PaginationOptions & {
	createdSince?: string
}

export type StatusGateway = {
	listStatuses(parentGid: string, opts?: StatusListOptions): Promise<ListResult<any>>
	getStatus(statusGid: string, opts?: ReadOptions): Promise<any>
	createStatus(parentGid: string, fields: StatusCreateFields): Promise<any>
	deleteStatus(statusGid: string): Promise<void>
}

export function createAsanaStatusGateway(client: Asana.ApiClient): StatusGateway {
	const statusUpdatesApi = new Asana.StatusUpdatesApi(client)

	return {
		async listStatuses(parentGid, opts) {
			const res = await statusUpdatesApi.getStatusesForObject(parentGid, {
				...toAsanaPaginationOptions(opts),
				...(opts?.createdSince !== undefined && { created_since: opts.createdSince }),
			})
			return await collectListResponse(res, opts)
		},
		async getStatus(statusGid, opts) {
			const res = await statusUpdatesApi.getStatus(statusGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createStatus(parentGid, fields) {
			const res = await statusUpdatesApi.createStatusForObject({ data: { parent: parentGid, ...fields } }, {})
			return res.data
		},
		async deleteStatus(statusGid) {
			await statusUpdatesApi.deleteStatus(statusGid)
		},
	}
}
