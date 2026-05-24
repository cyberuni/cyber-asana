import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import { createStory, getTaskTemplateData, interpolateTemplate, listStories } from './api.js'
import type { StoryApi } from './api.js'

function resolveStoryApi(api?: StoryApi | (() => StoryApi)): StoryApi {
	if (typeof api === 'function') return api()
	return api ?? { listStories, createStory, getTaskTemplateData }
}

function registerStoryToolsWithPrefix(
	server: McpServer,
	prefix: 'story' | 'comment',
	api?: StoryApi | (() => StoryApi),
) {
	server.tool(
		`asana_${prefix}_list`,
		'List Asana stories (comments) for a task',
		{ task_gid: z.string().describe('Task GID'), ...paginationParams },
		async ({ task_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveStoryApi(api).listStories(task_gid, paginationOptions(params))),
				},
			],
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
			const task = template ? await resolveStoryApi(api).getTaskTemplateData(task_gid) : undefined
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							await resolveStoryApi(api).createStory(task_gid, {
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

export function registerStoryTools(server: McpServer, api?: StoryApi | (() => StoryApi)) {
	registerStoryToolsWithPrefix(server, 'story', api)
	registerStoryToolsWithPrefix(server, 'comment', api)
}
