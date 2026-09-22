import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import type { ReadOptions } from '../read-options.js'
import { createAsanaUserGateway, type UserGateway } from './gateway.js'

export type UserApi = ReturnType<typeof createUserApi>

export function createUserApi(gateway: UserGateway) {
	return {
		listUsers(workspaceGid: string, opts?: Omit<PaginationOptions, 'limit' | 'fetchAll' | 'maxPages'>) {
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

function defaultUserApi() {
	return createUserApi(createAsanaUserGateway(createClient()))
}

export async function listUsers(
	workspaceGid: string,
	opts?: Omit<PaginationOptions, 'limit' | 'fetchAll' | 'maxPages'>,
) {
	return defaultUserApi().listUsers(workspaceGid, opts)
}

export async function getUser(userGid: string, opts?: ReadOptions) {
	return defaultUserApi().getUser(userGid, opts)
}

export async function getMe(opts?: ReadOptions) {
	return defaultUserApi().getMe(opts)
}
