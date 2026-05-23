import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import { getTask } from '../tasks/api.js'
import { createStory, interpolateTemplate, listStories } from './api.js'

function registerStoryToolsWithPrefix(server: McpServer, prefix: 'story' | 'comment') {
	server.tool(
		`asana_${prefix}_list`,
		'List Asana stories (comments) for a task',
		{ task_gid: z.string().describe('Task GID'), ...paginationParams },
		async ({ task_gid, ...params }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listStories(task_gid, paginationOptions(params))) }],
		}),
	)

	server.tool(
		`asana_${prefix}_create`,
		'Add a comment to an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			text: z
				.string()
				.describe(
					'Comment text. When template=true, supports {task.name}, {task.assignee}, {task.due_on}, {task.notes}',
				),
			template: z
				.boolean()
				.optional()
				.describe('Treat text as a template and interpolate task variables before posting'),
		},
		async ({ task_gid, text, template }) => {
			const body = template ? interpolateTemplate(text, await getTask(task_gid)) : text
			return { content: [{ type: 'text', text: JSON.stringify(await createStory(task_gid, body)) }] }
		},
	)
}

export function registerStoryTools(server: McpServer) {
	registerStoryToolsWithPrefix(server, 'story')
	registerStoryToolsWithPrefix(server, 'comment')
}
