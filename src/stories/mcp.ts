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
				.optional()
				.describe(
					'Comment text. When template=true, supports {task.name}, {task.assignee}, {task.due_on}, {task.notes}',
				),
			html_text: z
				.string()
				.optional()
				.describe(
					'Comment rich text as Asana HTML. When template=true, supports {task.name}, {task.assignee}, {task.due_on}, {task.notes}',
				),
			template: z
				.boolean()
				.optional()
				.describe('Treat text as a template and interpolate task variables before posting'),
		},
		async ({ task_gid, text, html_text, template }) => {
			const task = template ? await getTask(task_gid) : undefined
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							await createStory(task_gid, {
								...(text !== undefined && { text: task ? interpolateTemplate(text, task) : text }),
								...(html_text !== undefined && {
									html_text: task ? interpolateTemplate(html_text, task) : html_text,
								}),
							}),
						),
					},
				],
			}
		},
	)
}

export function registerStoryTools(server: McpServer) {
	registerStoryToolsWithPrefix(server, 'story')
	registerStoryToolsWithPrefix(server, 'comment')
}
