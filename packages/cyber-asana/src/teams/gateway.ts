import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

export type TeamGateway = {
	listTeams(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getTeam(teamGid: string, opts?: ReadOptions): Promise<any>
}

export function createAsanaTeamGateway(client: Asana.ApiClient): TeamGateway {
	const teamsApi = new Asana.TeamsApi(client)

	return {
		async listTeams(workspaceGid, opts) {
			const res = await teamsApi.getTeamsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getTeam(teamGid, opts) {
			const res = await teamsApi.getTeam(teamGid, toAsanaReadOptions(opts))
			return res.data
		},
	}
}
