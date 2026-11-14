import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** A team membership as `team members` asks for it: the user is all a scope needs. */
export type TeamMember = { gid?: string; user?: { gid?: string; name?: string } }

/** `archived` keeps only projects whose archived flag matches; unset returns both. */
export type TeamProjectListOptions = PaginationOptions & { archived?: boolean }

export type TeamGateway = {
	listTeams(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<Asana.Team>>
	getTeam(teamGid: string, opts?: ReadOptions): Promise<Asana.Team>
	/** The team's memberships, each carrying its `user`. */
	listTeamMembers(teamGid: string, opts?: PaginationOptions): Promise<ListResult<TeamMember>>
	listTeamProjects(teamGid: string, opts?: TeamProjectListOptions): Promise<ListResult<Asana.Project>>
}

export function createAsanaTeamGateway(client: Asana.ApiClient): TeamGateway {
	const teamsApi = new Asana.TeamsApi(client)
	const membershipsApi = new Asana.TeamMembershipsApi(client)
	const projectsApi = new Asana.ProjectsApi(client)

	return {
		async listTeams(workspaceGid, opts) {
			const res = await teamsApi.getTeamsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getTeam(teamGid, opts) {
			const res = await teamsApi.getTeam(teamGid, toAsanaReadOptions(opts))
			return res.data
		},
		async listTeamMembers(teamGid, opts) {
			const res = await membershipsApi.getTeamMembershipsForTeam(teamGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listTeamProjects(teamGid, opts) {
			const res = await projectsApi.getProjectsForTeam(teamGid, {
				...(opts?.archived !== undefined && { archived: opts.archived }),
				...toAsanaPaginationOptions(opts),
			})
			return await collectListResponse(res, opts)
		},
	}
}
