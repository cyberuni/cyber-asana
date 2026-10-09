import type { AiStudioGateway, AiStudioRunListOptions, AiStudioSeatListOptions } from './gateway.js'

export type AiStudioApi = ReturnType<typeof createAiStudioApi>

export function createAiStudioApi(gateway: AiStudioGateway) {
	return {
		listAiStudioRuns(workspaceGid: string, opts?: AiStudioRunListOptions) {
			return gateway.listAiStudioRuns(workspaceGid, opts)
		},
		listAiStudioSeats(workspaceGid: string, opts?: AiStudioSeatListOptions) {
			return gateway.listAiStudioSeats(workspaceGid, opts)
		},
	}
}
