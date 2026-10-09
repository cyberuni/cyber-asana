import { createClient } from '../platform/client.js'
import {
	type AiStudioGateway,
	type AiStudioRunListOptions,
	type AiStudioSeatListOptions,
	createAsanaAiStudioGateway,
} from './gateway.js'

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

function defaultAiStudioApi() {
	return createAiStudioApi(createAsanaAiStudioGateway(createClient()))
}

export async function listAiStudioRuns(workspaceGid: string, opts?: AiStudioRunListOptions) {
	return defaultAiStudioApi().listAiStudioRuns(workspaceGid, opts)
}

export async function listAiStudioSeats(workspaceGid: string, opts?: AiStudioSeatListOptions) {
	return defaultAiStudioApi().listAiStudioSeats(workspaceGid, opts)
}
