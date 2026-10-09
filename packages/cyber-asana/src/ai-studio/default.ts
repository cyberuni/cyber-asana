import { createClient } from '../platform/client.js'
import { createAiStudioApi } from './api.js'
import { type AiStudioRunListOptions, type AiStudioSeatListOptions, createAsanaAiStudioGateway } from './gateway.js'

function defaultAiStudioApi() {
	return createAiStudioApi(createAsanaAiStudioGateway(createClient()))
}

export async function listAiStudioRuns(workspaceGid: string, opts?: AiStudioRunListOptions) {
	return defaultAiStudioApi().listAiStudioRuns(workspaceGid, opts)
}

export async function listAiStudioSeats(workspaceGid: string, opts?: AiStudioSeatListOptions) {
	return defaultAiStudioApi().listAiStudioSeats(workspaceGid, opts)
}
