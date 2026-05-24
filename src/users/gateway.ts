import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type UserGateway = {
	listUsers(workspaceGid: string, opts?: Omit<PaginationOptions, 'limit' | 'fetchAll' | 'maxPages'>): Promise<ListResult<any>>
	getUser(userGid: string): Promise<any>
	getMe(): Promise<any>
}

export function createAsanaUserGateway(client: Asana.ApiClient): UserGateway {
	const usersApi = new Asana.UsersApi(client)

	return {
		async listUsers(workspaceGid, opts) {
			const res = await usersApi.getUsersForWorkspace(workspaceGid, toAsanaPaginationOptions(opts, { limit: false }))
			return await collectListResponse(res, opts, { limit: false })
		},
		async getUser(userGid) {
			const res = await usersApi.getUser(userGid, {})
			return res.data
		},
		async getMe() {
			const res = await usersApi.getUser('me', {})
			return res.data
		},
	}
}
