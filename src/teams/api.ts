import Asana from 'asana'
import { createClient } from '../client.js'

export async function listTeams(workspaceGid: string) {
	const api = new Asana.TeamsApi(createClient())
	const res = await api.getTeamsForWorkspace(workspaceGid, {})
	return res.data
}

export async function getTeam(teamGid: string) {
	const api = new Asana.TeamsApi(createClient())
	const res = await api.getTeam(teamGid, {})
	return res.data
}
