import type { UserGateway, UserListOptions, UserReadOptions } from './gateway.js'

export type UserApi = ReturnType<typeof createUserApi>

export function createUserApi(gateway: UserGateway) {
	return {
		listUsers(workspaceGid: string, opts?: UserListOptions) {
			return gateway.listUsers(workspaceGid, opts)
		},
		getUser(userGid: string, opts?: UserReadOptions) {
			return gateway.getUser(userGid, opts)
		},
		getMe(opts?: UserReadOptions) {
			return gateway.getMe(opts)
		},
	}
}
