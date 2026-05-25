import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import type { TeamApi } from './api.js'
import { getTeam, listTeams } from './api.js'

function resolveTeamApi(api?: TeamApi | (() => TeamApi)): TeamApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTeams,
			getTeam,
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
		{ team_gid: z.string().describe('Team GID') },
		async ({ team_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveTeamApi(api).getTeam(team_gid)) }],
		}),
	)
}
