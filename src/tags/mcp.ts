import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import { createTag, getTag, listTags } from './api.js'

export function registerTagTools(server: McpServer) {
	server.tool(
		'asana_tag_list',
		'List Asana tags in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listTags(workspace_gid, paginationOptions(params))) }],
		}),
	)

	server.tool(
		'asana_tag_get',
		'Get an Asana tag by GID',
		{ tag_gid: z.string().describe('Tag GID') },
		async ({ tag_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getTag(tag_gid)) }],
		}),
	)

	server.tool(
		'asana_tag_create',
		'Create an Asana tag',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Tag name'),
		},
		async ({ workspace_gid, name }) => ({
			content: [{ type: 'text', text: JSON.stringify(await createTag(workspace_gid, name)) }],
		}),
	)
}
