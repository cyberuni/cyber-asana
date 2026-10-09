import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createUserApi } from './api.js'
import { createAsanaUserGateway } from './gateway.js'

function defaultUserApi() {
	return createUserApi(createAsanaUserGateway(createClient()))
}

export async function listUsers(workspaceGid: string, opts?: PaginationOptions) {
	return defaultUserApi().listUsers(workspaceGid, opts)
}

export async function getUser(userGid: string, opts?: ReadOptions) {
	return defaultUserApi().getUser(userGid, opts)
}

export async function getMe(opts?: ReadOptions) {
	return defaultUserApi().getMe(opts)
}
