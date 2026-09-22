import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type UserGateway = {
	listUsers(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getUser(userGid: string, opts?: ReadOptions): Promise<any>
	getMe(opts?: ReadOptions): Promise<any>
}

export function createAsanaUserGateway(client: Asana.ApiClient): UserGateway {
	const usersApi = new Asana.UsersApi(client)

	return {
		async listUsers(workspaceGid, opts) {
			// GET /users?workspace= pages (sorted by id); GET /workspaces/{gid}/users cannot, and
			// returns 400 "result is too large" on big workspaces.
			const res = await usersApi.getUsers({ workspace: workspaceGid, ...toAsanaPaginationOptions(opts) })
			return await collectListResponse(res, opts)
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
