import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParamsWithoutLimit } from '../mcp-options.js'
import type { UserApi } from './api.js'
import { getMe, getUser, listUsers } from './api.js'

function resolveUserApi(api?: UserApi | (() => UserApi)): UserApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listUsers,
			getUser,
			getMe,
		}
	)
}

export function registerUserTools(server: McpServer, api?: UserApi | (() => UserApi)) {
	server.tool(
		'asana_user_list',
		'List Asana users in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParamsWithoutLimit },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveUserApi(api).listUsers(workspace_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_user_get',
		'Get an Asana user by GID',
		{ user_gid: z.string().describe('User GID') },
		async ({ user_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveUserApi(api).getUser(user_gid)) }],
		}),
	)

	server.tool('asana_user_me', 'Get the authenticated Asana user', {}, async () => ({
		content: [{ type: 'text', text: JSON.stringify(await resolveUserApi(api).getMe()) }],
	}))
}
