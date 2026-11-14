import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createTeamApi } from './api.js'
import { createAsanaTeamGateway, type TeamProjectListOptions } from './gateway.js'

function defaultTeamApi() {
	return createTeamApi(createAsanaTeamGateway(createClient()))
}

export async function listTeams(workspaceGid: string, opts?: PaginationOptions) {
	return defaultTeamApi().listTeams(workspaceGid, opts)
}

export async function getTeam(teamGid: string, opts?: ReadOptions) {
	return defaultTeamApi().getTeam(teamGid, opts)
}

export async function listTeamMembers(teamGid: string, opts?: PaginationOptions) {
	return defaultTeamApi().listTeamMembers(teamGid, opts)
}

export async function listTeamProjects(teamGid: string, opts?: TeamProjectListOptions) {
	return defaultTeamApi().listTeamProjects(teamGid, opts)
}
