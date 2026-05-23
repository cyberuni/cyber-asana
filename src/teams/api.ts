import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export async function listTeams(workspaceGid: string, opts?: PaginationOptions) {
	const api = new Asana.TeamsApi(createClient())
	const res = await api.getTeamsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
	return await collectListResponse(res, opts)
}

export async function getTeam(teamGid: string) {
	const api = new Asana.TeamsApi(createClient())
	const res = await api.getTeam(teamGid, {})
	return res.data
}
