import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export async function listWorkspaces(opts?: PaginationOptions) {
	const api = new Asana.WorkspacesApi(createClient())
	const res = await api.getWorkspaces(toAsanaPaginationOptions(opts))
	return await collectListResponse(res, opts)
}

export async function getWorkspace(workspaceGid: string) {
	const api = new Asana.WorkspacesApi(createClient())
	const res = await api.getWorkspace(workspaceGid, {})
	return res.data
}
