import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getTeam, listTeams } from './api.js'

export function registerTeamTools(server: McpServer) {
	server.tool(
		'asana_team_list',
		'List Asana teams in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID') },
		async ({ workspace_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listTeams(workspace_gid)) }],
		}),
	)

	server.tool(
		'asana_team_get',
		'Get an Asana team by GID',
		{ team_gid: z.string().describe('Team GID') },
		async ({ team_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getTeam(team_gid)) }],
		}),
	)
}
