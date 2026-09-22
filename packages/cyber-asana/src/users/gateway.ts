import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type UserGateway = {
	listUsers(
		workspaceGid: string,
		opts?: Omit<PaginationOptions, 'limit' | 'fetchAll' | 'maxPages'>,
	): Promise<ListResult<any>>
	getUser(userGid: string, opts?: ReadOptions): Promise<any>
	getMe(opts?: ReadOptions): Promise<any>
}

export function createAsanaUserGateway(client: Asana.ApiClient): UserGateway {
	const usersApi = new Asana.UsersApi(client)

	return {
		async listUsers(workspaceGid, opts) {
			const res = await usersApi.getUsersForWorkspace(workspaceGid, toAsanaPaginationOptions(opts, { limit: false }))
			return await collectListResponse(res, opts, { limit: false })
		},
		async getUser(userGid, opts) {
			const res = await usersApi.getUser(userGid, toAsanaReadOptions(opts))
			return res.data
		},
		async getMe(opts) {
			const res = await usersApi.getUser('me', toAsanaReadOptions(opts))
			return res.data
		},
	}
}
