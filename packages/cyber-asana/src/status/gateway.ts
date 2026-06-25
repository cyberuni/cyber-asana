import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type StatusCreateFields = {
	status_type: string
	text?: string
	html_text?: string
	title?: string
}

export type StatusGateway = {
	listStatuses(parentGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getStatus(statusGid: string): Promise<any>
	createStatus(parentGid: string, fields: StatusCreateFields): Promise<any>
	deleteStatus(statusGid: string): Promise<void>
}

export function createAsanaStatusGateway(client: Asana.ApiClient): StatusGateway {
	const statusUpdatesApi = new Asana.StatusUpdatesApi(client)

	return {
		async listStatuses(parentGid, opts) {
			const res = await statusUpdatesApi.getStatusesForObject(parentGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getStatus(statusGid) {
			const res = await statusUpdatesApi.getStatus(statusGid, {})
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
