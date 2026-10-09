import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createWorkspaceApi } from './api.js'
import { createAsanaWorkspaceGateway } from './gateway.js'

function defaultWorkspaceApi() {
	return createWorkspaceApi(createAsanaWorkspaceGateway(createClient()))
}

export async function listWorkspaces(opts?: PaginationOptions) {
	return defaultWorkspaceApi().listWorkspaces(opts)
}

export async function getWorkspace(workspaceGid: string, opts?: ReadOptions) {
	return defaultWorkspaceApi().getWorkspace(workspaceGid, opts)
}
