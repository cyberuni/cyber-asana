import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export async function listUsers(
	workspaceGid: string,
	opts?: Omit<PaginationOptions, 'limit' | 'fetchAll' | 'maxPages'>,
) {
	const api = new Asana.UsersApi(createClient())
	const res = await api.getUsersForWorkspace(workspaceGid, toAsanaPaginationOptions(opts, { limit: false }))
	return await collectListResponse(res, opts, { limit: false })
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
