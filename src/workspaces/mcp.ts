import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import type { WorkspaceApi } from './api.js'
import { getWorkspace, listWorkspaces } from './api.js'

function resolveWorkspaceApi(api?: WorkspaceApi | (() => WorkspaceApi)): WorkspaceApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listWorkspaces,
			getWorkspace,
		}
	)
}

export function registerWorkspaceTools(server: McpServer, api?: WorkspaceApi | (() => WorkspaceApi)) {
	server.tool('asana_workspace_list', 'List all Asana workspaces', paginationParams, async (params) => ({
		content: [
			{ type: 'text', text: JSON.stringify(await resolveWorkspaceApi(api).listWorkspaces(paginationOptions(params))) },
		],
	}))

	server.tool(
		'asana_workspace_get',
		'Get an Asana workspace by GID',
		{ workspace_gid: z.string().describe('Workspace GID') },
		async ({ workspace_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveWorkspaceApi(api).getWorkspace(workspace_gid)) }],
		}),
	)
}
