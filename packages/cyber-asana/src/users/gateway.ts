import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** `team` narrows the list to the members of one team. */
export type UserListOptions = PaginationOptions & { team?: string }

/** `workspaceGid` is sent as Asana's `workspace`, which scopes the fields that vary by workspace. */
export type UserReadOptions = ReadOptions & { workspaceGid?: string }

function toAsanaUserReadOptions(opts?: UserReadOptions) {
	return {
		...toAsanaReadOptions(opts),
		...(opts?.workspaceGid !== undefined && { workspace: opts.workspaceGid }),
	}
}

export type UserGateway = {
	listUsers(workspaceGid: string, opts?: UserListOptions): Promise<ListResult<Asana.User>>
	getUser(userGid: string, opts?: UserReadOptions): Promise<Asana.User>
	getMe(opts?: UserReadOptions): Promise<Asana.User>
}

export function createAsanaUserGateway(client: Asana.ApiClient): UserGateway {
	const usersApi = new Asana.UsersApi(client)

	return {
		async listUsers(workspaceGid, opts) {
			// GET /users?workspace= pages (sorted by id); GET /workspaces/{gid}/users cannot, and
			// returns 400 "result is too large" on big workspaces.
			const res = await usersApi.getUsers({
				workspace: workspaceGid,
				...(opts?.team !== undefined && { team: opts.team }),
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
		async getUser(userGid, opts) {
			const res = await usersApi.getUser(userGid, toAsanaUserReadOptions(opts))
			return res.data
		},
		async getMe(opts) {
			const res = await usersApi.getUser('me', toAsanaUserReadOptions(opts))
			return res.data
		},
	}
}
