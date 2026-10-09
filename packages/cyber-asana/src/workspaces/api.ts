import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { WorkspaceGateway } from './gateway.js'

export type WorkspaceApi = ReturnType<typeof createWorkspaceApi>

export function createWorkspaceApi(gateway: WorkspaceGateway) {
	return {
		listWorkspaces(opts?: PaginationOptions) {
			return gateway.listWorkspaces(opts)
		},
		getWorkspace(workspaceGid: string, opts?: ReadOptions) {
			return gateway.getWorkspace(workspaceGid, opts)
		},
	}
}
