import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { UserApi } from './api.js'
import { getMe, getUser, listUsers } from './default.js'
import type { UserReadOptions } from './gateway.js'

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

const workspaceParam = z
	.string()
	.optional()
	.describe('Workspace GID to read workspace-specific user fields for; sent only when given')

function userReadOptions(
	params: Parameters<typeof readOptions>[0],
	workspaceGid?: string,
): UserReadOptions | undefined {
	const read = readOptions(params)
	return workspaceGid === undefined ? read : { ...read, workspaceGid }
}

export function registerUserTools(server: McpServer, api?: UserApi | (() => UserApi)) {
	server.tool(
		'asana_user_list',
		'List Asana users in a workspace, optionally only the members of a team',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			team_gid: z.string().optional().describe('Only the members of this team GID'),
			...paginationParams,
		},
		async ({ workspace_gid, team_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveUserApi(api).listUsers(workspace_gid, {
							...paginationOptions(params),
							...(team_gid !== undefined && { team: team_gid }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_user_get',
		'Get an Asana user by GID',
		{ user_gid: z.string().describe('User GID'), workspace_gid: workspaceParam, ...readParams },
		async ({ user_gid, workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveUserApi(api).getUser(user_gid, userReadOptions(params, workspace_gid))),
				},
			],
		}),
	)

	server.tool(
		'asana_user_me',
		'Get the authenticated Asana user',
		{ workspace_gid: workspaceParam, ...readParams },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveUserApi(api).getMe(userReadOptions(params, workspace_gid))),
				},
			],
		}),
	)
}
