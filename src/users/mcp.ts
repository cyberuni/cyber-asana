import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getMe, getUser, listUsers } from './api.js'

export function registerUserTools(server: McpServer) {
	server.tool(
		'asana_user_list',
		'List Asana users in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID') },
		async ({ workspace_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listUsers(workspace_gid)) }],
		}),
	)

	server.tool(
		'asana_user_get',
		'Get an Asana user by GID',
		{ user_gid: z.string().describe('User GID') },
		async ({ user_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getUser(user_gid)) }],
		}),
	)

	server.tool('asana_user_me', 'Get the authenticated Asana user', {}, async () => ({
		content: [{ type: 'text', text: JSON.stringify(await getMe()) }],
	}))
}
