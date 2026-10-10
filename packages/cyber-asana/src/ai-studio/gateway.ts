import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'

/** Asana filters runs by when their credit usage was recorded, not by `run_started_at`. */
export type AiStudioRunListOptions = PaginationOptions & {
	startAt?: string
	endAt?: string
	divisionGid?: string
}

/** Seat states Asana filters on; `expired` appears on seats but is not a filter value. */
export const AI_STUDIO_SEAT_FILTER_STATES = ['active', 'revoked'] as const

export type AiStudioSeatFilterState = (typeof AI_STUDIO_SEAT_FILTER_STATES)[number]

export type AiStudioSeatListOptions = PaginationOptions & {
	state?: AiStudioSeatFilterState
	divisionGid?: string
}

export type AiStudioGateway = {
	listAiStudioRuns(workspaceGid: string, opts?: AiStudioRunListOptions): Promise<ListResult<Asana.AiStudioRecord>>
	listAiStudioSeats(workspaceGid: string, opts?: AiStudioSeatListOptions): Promise<ListResult<Asana.AiStudioRecord>>
}

// The usage endpoints return a fixed row shape and do not list opt_fields among their parameters.
function toAsanaPageOptions(opts?: PaginationOptions) {
	const { opt_fields: _optFields, ...page } = toAsanaPaginationOptions(opts)
	return page
}

export function createAsanaAiStudioGateway(client: Asana.ApiClient): AiStudioGateway {
	const aiStudioApi = new Asana.AIStudioUsageAPIApi(client)

	return {
		async listAiStudioRuns(workspaceGid, opts) {
			const res = await aiStudioApi.getAiStudioRuns(workspaceGid, {
				...toAsanaPageOptions(opts),
				...(opts?.startAt !== undefined && { start_at: opts.startAt }),
				...(opts?.endAt !== undefined && { end_at: opts.endAt }),
				...(opts?.divisionGid !== undefined && { division_gid: opts.divisionGid }),
			})
			return await collectListResponse(res, opts)
		},
		async listAiStudioSeats(workspaceGid, opts) {
			const res = await aiStudioApi.getAiStudioSeats(workspaceGid, {
				...toAsanaPageOptions(opts),
				...(opts?.state !== undefined && { state: opts.state }),
				...(opts?.divisionGid !== undefined && { division_gid: opts.divisionGid }),
			})
			return await collectListResponse(res, opts)
		},
	}
}
