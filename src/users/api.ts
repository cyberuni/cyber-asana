import Asana from 'asana'
import { createClient } from '../client.js'

export async function listUsers(workspaceGid: string) {
	const api = new Asana.UsersApi(createClient())
	const res = await api.getUsersForWorkspace(workspaceGid, {})
	return res.data
}

export async function getUser(userGid: string) {
	const api = new Asana.UsersApi(createClient())
	const res = await api.getUser(userGid, {})
	return res.data
}

export async function getMe() {
	const api = new Asana.UsersApi(createClient())
	const res = await api.getUser('me', {})
	return res.data
}
