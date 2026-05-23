import Asana from 'asana'
import { createClient } from '../client.js'

export async function listWorkspaces() {
	const api = new Asana.WorkspacesApi(createClient())
	const res = await api.getWorkspaces({})
	return res.data
}

export async function getWorkspace(workspaceGid: string) {
	const api = new Asana.WorkspacesApi(createClient())
	const res = await api.getWorkspace(workspaceGid, {})
	return res.data
}
