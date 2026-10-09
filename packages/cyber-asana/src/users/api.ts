import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { UserGateway } from './gateway.js'

export type UserApi = ReturnType<typeof createUserApi>

export function createUserApi(gateway: UserGateway) {
	return {
		listUsers(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listUsers(workspaceGid, opts)
		},
		getUser(userGid: string, opts?: ReadOptions) {
			return gateway.getUser(userGid, opts)
		},
		getMe(opts?: ReadOptions) {
			return gateway.getMe(opts)
		},
	}
}
