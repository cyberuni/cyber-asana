import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaTeamGateway, type TeamGateway } from './gateway.js'

export type TeamApi = ReturnType<typeof createTeamApi>

export function createTeamApi(gateway: TeamGateway) {
	return {
		listTeams(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listTeams(workspaceGid, opts)
		},
		getTeam(teamGid: string) {
			return gateway.getTeam(teamGid)
		},
	}
}

function defaultTeamApi() {
	return createTeamApi(createAsanaTeamGateway(createClient()))
}

export async function listTeams(workspaceGid: string, opts?: PaginationOptions) {
	return defaultTeamApi().listTeams(workspaceGid, opts)
}

export async function getTeam(teamGid: string) {
	return defaultTeamApi().getTeam(teamGid)
}
