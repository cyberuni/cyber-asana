import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaUserGateway, type UserGateway } from './gateway.js'

export type UserApi = ReturnType<typeof createUserApi>

export function createUserApi(gateway: UserGateway) {
	return {
		listUsers(workspaceGid: string, opts?: Omit<PaginationOptions, 'limit' | 'fetchAll' | 'maxPages'>) {
			return gateway.listUsers(workspaceGid, opts)
		},
		getUser(userGid: string) {
			return gateway.getUser(userGid)
		},
		getMe() {
			return gateway.getMe()
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

export async function getUser(userGid: string) {
	return defaultUserApi().getUser(userGid)
}

export async function getMe() {
	return defaultUserApi().getMe()
}
