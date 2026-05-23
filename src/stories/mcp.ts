import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createStory, listStories } from './api.js'

export function registerStoryTools(server: McpServer) {
	server.tool(
		'asana_story_list',
		'List Asana stories (comments) for a task',
		{ task_gid: z.string().describe('Task GID') },
		async ({ task_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listStories(task_gid)) }],
		}),
	)

	server.tool(
		'asana_story_create',
		'Add a comment to an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			text: z.string().describe('Comment text'),
		},
		async ({ task_gid, text }) => ({
			content: [{ type: 'text', text: JSON.stringify(await createStory(task_gid, text)) }],
		}),
	)
}
