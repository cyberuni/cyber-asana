import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { StoryApi } from './api.js'
import { interpolateTemplate } from './api.js'
import {
	createGoalStory,
	createStory,
	deleteStory,
	getStory,
	getTaskTemplateData,
	listGoalStories,
	listStories,
	updateStory,
} from './default.js'
import { STICKER_NAMES } from './write-options.js'

const listFilterParams = {
	created_after: z
		.string()
		.optional()
		.describe('Only stories created after this ISO 8601 date-time (exclusive, second granularity)'),
	comments_only: z.boolean().optional().describe('Only comments, not system activity'),
	sort_ascending: z.boolean().optional().describe('Oldest first (the default) when true, newest first when false'),
}

function listOptions(params: {
	created_after?: string
	comments_only?: boolean
	sort_ascending?: boolean
	[key: string]: unknown
}) {
	const { created_after, comments_only, sort_ascending, ...rest } = params
	return {
		...paginationOptions(rest),
		...(created_after !== undefined && { createdAfter: created_after }),
		...(comments_only !== undefined && { commentsOnly: comments_only }),
		...(sort_ascending !== undefined && { sortAscending: sort_ascending }),
	}
}

function resolveStoryApi(api?: StoryApi | (() => StoryApi)): StoryApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listStories,
			createStory,
			getStory,
			updateStory,
			deleteStory,
			getTaskTemplateData,
			listGoalStories,
			createGoalStory,
		}
	)
}

const EDITABLE_STORY_NOTE =
	'Only comment stories you authored can be changed; system stories (assignee changed, due date set) are immutable.'

function registerStoryToolsWithPrefix(
	server: McpServer,
	prefix: 'story' | 'comment',
	api?: StoryApi | (() => StoryApi),
) {
	server.tool(
		`asana_${prefix}_list`,
		'List Asana stories (comments) for a task',
		{ task_gid: z.string().describe('Task GID'), ...listFilterParams, ...paginationParams },
		async ({ task_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveStoryApi(api).listStories(task_gid, listOptions(params))),
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
			is_pinned: z.boolean().optional().describe('Pin the new comment on the task'),
			sticker_name: z.enum(STICKER_NAMES).optional().describe('Sticker to attach to the comment'),
			parent_comment_gid: z
				.string()
				.optional()
				.describe(
					'Reply in a thread: the comment_gid of the top-level comment to reply to (read it with opt_fields comment_gid on get or list), not its story GID. The parent must be on this task and must not itself be a reply',
				),
			template: z
				.boolean()
				.optional()
				.describe('Treat text as a template and interpolate task variables before posting'),
			...readParams,
		},
		async ({ task_gid, text, html_text, is_pinned, sticker_name, parent_comment_gid, template, ...params }) => {
			const task = template ? await resolveStoryApi(api).getTaskTemplateData(task_gid) : undefined
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							await resolveStoryApi(api).createStory(
								task_gid,
								{
									...(text !== undefined && { text: task ? interpolateTemplate(text, task) : text }),
									...(html_text !== undefined && {
										html_text: task ? interpolateTemplate(html_text, task) : html_text,
									}),
									...(is_pinned !== undefined && { is_pinned }),
									...(sticker_name !== undefined && { sticker_name }),
									...(parent_comment_gid !== undefined && { parent_comment: parent_comment_gid }),
								},
								readOptions(params),
							),
						),
					},
				],
			}
		},
	)

	server.tool(
		`asana_${prefix}_get`,
		'Get an Asana story (comment) by GID',
		{ story_gid: z.string().describe('Story GID'), ...readParams },
		async ({ story_gid, ...params }) => ({
			content: [
				{ type: 'text', text: JSON.stringify(await resolveStoryApi(api).getStory(story_gid, readOptions(params))) },
			],
		}),
	)

	server.tool(
		`asana_${prefix}_update`,
		`Edit the text of an Asana comment. ${EDITABLE_STORY_NOTE}`,
		{
			story_gid: z.string().describe('Story GID'),
			text: z.string().optional().describe('Replacement comment text'),
			html_text: z.string().optional().describe('Replacement comment rich text as Asana HTML'),
			is_pinned: z.boolean().optional().describe('Pin (true) or unpin (false) the comment on its task'),
			sticker_name: z.enum(STICKER_NAMES).optional().describe('Sticker to attach to the comment'),
			...readParams,
		},
		async ({ story_gid, text, html_text, is_pinned, sticker_name, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveStoryApi(api).updateStory(
							story_gid,
							{
								...(text !== undefined && { text }),
								...(html_text !== undefined && { html_text }),
								...(is_pinned !== undefined && { is_pinned }),
								...(sticker_name !== undefined && { sticker_name }),
							},
							readOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		`asana_${prefix}_delete`,
		`Delete an Asana comment. ${EDITABLE_STORY_NOTE}`,
		{ story_gid: z.string().describe('Story GID') },
		async ({ story_gid }) => {
			const result = await deleteIdempotently('story', story_gid, () => resolveStoryApi(api).deleteStory(story_gid))
			return { content: [{ type: 'text', text: JSON.stringify(result) }] }
		},
	)
}

function registerGoalStoryTools(server: McpServer, api?: StoryApi | (() => StoryApi)) {
	server.tool(
		'asana_story_goal_list',
		"List an Asana goal's stories (comments), such as progress notes (paid plan)",
		{ goal_gid: z.string().describe('Goal GID'), ...listFilterParams, ...paginationParams },
		async ({ goal_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveStoryApi(api).listGoalStories(goal_gid, listOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_story_goal_create',
		'Post a comment on an Asana goal (paid plan)',
		{
			goal_gid: z.string().describe('Goal GID'),
			text: z.string().optional().describe('Comment text'),
			html_text: z.string().optional().describe('Comment rich text as Asana HTML'),
			is_pinned: z.boolean().optional().describe('Pin the new comment on the goal'),
			sticker_name: z.enum(STICKER_NAMES).optional().describe('Sticker to attach to the comment'),
			...readParams,
		},
		async ({ goal_gid, text, html_text, is_pinned, sticker_name, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveStoryApi(api).createGoalStory(
							goal_gid,
							{
								...(text !== undefined && { text }),
								...(html_text !== undefined && { html_text }),
								...(is_pinned !== undefined && { is_pinned }),
								...(sticker_name !== undefined && { sticker_name }),
							},
							readOptions(params),
						),
					),
				},
			],
		}),
	)
}

export function registerStoryTools(server: McpServer, api?: StoryApi | (() => StoryApi)) {
	registerGoalStoryTools(server, api)
	registerStoryToolsWithPrefix(server, 'story', api)
	registerStoryToolsWithPrefix(server, 'comment', api)
}
