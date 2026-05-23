import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getWorkspace, listWorkspaces } from './api.js'

export function registerWorkspaceTools(server: McpServer) {
	server.tool('asana_workspace_list', 'List all Asana workspaces', {}, async () => ({
		content: [{ type: 'text', text: JSON.stringify(await listWorkspaces()) }],
	}))

	server.tool(
		'asana_workspace_get',
		'Get an Asana workspace by GID',
		{ workspace_gid: z.string().describe('Workspace GID') },
		async ({ workspace_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getWorkspace(workspace_gid)) }],
		}),
	)
}
