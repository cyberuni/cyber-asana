import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaWorkspaceGateway, type WorkspaceGateway } from './gateway.js'

export type WorkspaceApi = ReturnType<typeof createWorkspaceApi>

export function createWorkspaceApi(gateway: WorkspaceGateway) {
	return {
		listWorkspaces(opts?: PaginationOptions) {
			return gateway.listWorkspaces(opts)
		},
		getWorkspace(workspaceGid: string) {
			return gateway.getWorkspace(workspaceGid)
		},
	}
}

function defaultWorkspaceApi() {
	return createWorkspaceApi(createAsanaWorkspaceGateway(createClient()))
}

export async function listWorkspaces(opts?: PaginationOptions) {
	return defaultWorkspaceApi().listWorkspaces(opts)
}

export async function getWorkspace(workspaceGid: string) {
	return defaultWorkspaceApi().getWorkspace(workspaceGid)
}
