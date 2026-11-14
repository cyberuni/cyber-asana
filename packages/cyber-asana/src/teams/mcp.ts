import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { TeamApi } from './api.js'
import { getTeam, listTeamMembers, listTeamProjects, listTeams } from './default.js'

function resolveTeamApi(api?: TeamApi | (() => TeamApi)): TeamApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTeams,
			getTeam,
			listTeamMembers,
			listTeamProjects,
		}
	)
}

export function registerTeamTools(server: McpServer, api?: TeamApi | (() => TeamApi)) {
	server.tool(
		'asana_team_list',
		'List Asana teams in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTeamApi(api).listTeams(workspace_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_team_get',
		'Get an Asana team by GID',
		{ team_gid: z.string().describe('Team GID'), ...readParams },
		async ({ team_gid, ...params }) => ({
			content: [
				{ type: 'text', text: JSON.stringify(await resolveTeamApi(api).getTeam(team_gid, readOptions(params))) },
			],
		}),
	)

	server.tool(
		'asana_team_members',
		"List an Asana team's members: each membership carries its user GID and name",
		{ team_gid: z.string().describe('Team GID'), ...paginationParams },
		async ({ team_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTeamApi(api).listTeamMembers(team_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_team_projects',
		"List an Asana team's projects",
		{
			team_gid: z.string().describe('Team GID'),
			archived: z.boolean().optional().describe('Only return projects whose archived flag matches this value'),
			...paginationParams,
		},
		async ({ team_gid, archived, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveTeamApi(api).listTeamProjects(team_gid, {
							...paginationOptions(params),
							...(archived !== undefined && { archived }),
						}),
					),
				},
			],
		}),
	)
}
