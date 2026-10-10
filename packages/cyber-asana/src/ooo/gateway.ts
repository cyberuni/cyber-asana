import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** The two mutable fields of an OOO entry — Asana models nothing else on it. */
export type OooEntryWriteFields = {
	start_date?: string
	end_date?: string
}

/** Asana filters the list to entries overlapping this window. */
export type OooEntryListOptions = PaginationOptions & {
	startDate?: string
	endDate?: string
}

export type OooGateway = {
	listOooEntries(userGid: string, workspaceGid: string, opts?: OooEntryListOptions): Promise<ListResult<Asana.OooEntry>>
	getOooEntry(oooEntryGid: string, opts?: ReadOptions): Promise<Asana.OooEntry>
	createOooEntry(
		userGid: string,
		workspaceGid: string,
		fields: { start_date: string; end_date: string },
	): Promise<Asana.OooEntry>
	updateOooEntry(oooEntryGid: string, fields: OooEntryWriteFields): Promise<Asana.OooEntry>
	deleteOooEntry(oooEntryGid: string): Promise<void>
}

function toAsanaListOptions(opts?: OooEntryListOptions) {
	return {
		...toAsanaPaginationOptions(opts),
		...(opts?.startDate !== undefined && { start_date: opts.startDate }),
		...(opts?.endDate !== undefined && { end_date: opts.endDate }),
	}
}

export function createAsanaOooGateway(client: Asana.ApiClient): OooGateway {
	const oooEntriesApi = new Asana.OooEntriesApi(client)

	return {
		async listOooEntries(userGid, workspaceGid, opts) {
			const res = await oooEntriesApi.getOooEntries(userGid, workspaceGid, toAsanaListOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getOooEntry(oooEntryGid, opts) {
			const res = await oooEntriesApi.getOooEntry(oooEntryGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createOooEntry(userGid, workspaceGid, fields) {
			const res = await oooEntriesApi.createOooEntry({
				data: { user: userGid, workspace: workspaceGid, ...fields },
			})
			return res.data
		},
		async updateOooEntry(oooEntryGid, fields) {
			const res = await oooEntriesApi.updateOooEntry({ data: fields }, oooEntryGid, {})
			return res.data
		},
		async deleteOooEntry(oooEntryGid) {
			await oooEntriesApi.deleteOooEntry(oooEntryGid)
		},
	}
}
