import Asana from 'asana'
import { createClient } from '../client.js'
import { type PaginationOptions, toAsanaPaginationOptions, unwrapListResponse } from '../pagination.js'

export async function listTeams(workspaceGid: string, opts?: PaginationOptions) {
	const api = new Asana.TeamsApi(createClient())
	const res = await api.getTeamsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
	return unwrapListResponse(res, opts)
}

export async function getTeam(teamGid: string) {
	const api = new Asana.TeamsApi(createClient())
	const res = await api.getTeam(teamGid, {})
	return res.data
}
