import Asana from 'asana'
import { createClient } from '../client.js'
import { type PaginationOptions, toAsanaPaginationOptions, unwrapListResponse } from '../pagination.js'

export async function listWorkspaces(opts?: PaginationOptions) {
	const api = new Asana.WorkspacesApi(createClient())
	const res = await api.getWorkspaces(toAsanaPaginationOptions(opts))
	return unwrapListResponse(res, opts)
}

export async function getWorkspace(workspaceGid: string) {
	const api = new Asana.WorkspacesApi(createClient())
	const res = await api.getWorkspace(workspaceGid, {})
	return res.data
}
