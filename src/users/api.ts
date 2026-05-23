import Asana from 'asana'
import { createClient } from '../client.js'
import { type PaginationOptions, toAsanaPaginationOptions, unwrapListResponse } from '../pagination.js'

export async function listUsers(workspaceGid: string, opts?: Omit<PaginationOptions, 'limit'>) {
	const api = new Asana.UsersApi(createClient())
	const res = await api.getUsersForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
	return unwrapListResponse(res, opts)
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
