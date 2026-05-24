import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type WorkspaceGateway = {
	listWorkspaces(opts?: PaginationOptions): Promise<ListResult<any>>
	getWorkspace(workspaceGid: string): Promise<any>
}

export function createAsanaWorkspaceGateway(client: Asana.ApiClient): WorkspaceGateway {
	const workspacesApi = new Asana.WorkspacesApi(client)

	return {
		async listWorkspaces(opts) {
			const res = await workspacesApi.getWorkspaces(toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getWorkspace(workspaceGid) {
			const res = await workspacesApi.getWorkspace(workspaceGid, {})
			return res.data
		},
	}
}
