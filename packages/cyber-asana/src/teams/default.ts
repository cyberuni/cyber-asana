import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createTeamApi } from './api.js'
import { createAsanaTeamGateway } from './gateway.js'

function defaultTeamApi() {
	return createTeamApi(createAsanaTeamGateway(createClient()))
}

export async function listTeams(workspaceGid: string, opts?: PaginationOptions) {
	return defaultTeamApi().listTeams(workspaceGid, opts)
}

export async function getTeam(teamGid: string, opts?: ReadOptions) {
	return defaultTeamApi().getTeam(teamGid, opts)
}
