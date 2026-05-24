import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import type { TagApi } from './api.js'
import {
	addTagToTask,
	createTag,
	deleteTag,
	getTag,
	listTags,
	listTagsForTask,
	listTasksForTag,
	removeTagFromTask,
	updateTag,
} from './api.js'

function resolveTagApi(api?: TagApi | (() => TagApi)): TagApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTags,
			getTag,
			createTag,
			updateTag,
			deleteTag,
			listTagsForTask,
			listTasksForTag,
			addTagToTask,
			removeTagFromTask,
		}
	)
}

export function registerTagTools(server: McpServer, api?: TagApi | (() => TagApi)) {
	server.tool(
		'asana_tag_list',
		'List Asana tags in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTagApi(api).listTags(workspace_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_tag_get',
		'Get an Asana tag by GID',
		{ tag_gid: z.string().describe('Tag GID') },
		async ({ tag_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveTagApi(api).getTag(tag_gid)) }],
		}),
	)

	server.tool(
		'asana_tag_create',
		'Create an Asana tag',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Tag name'),
			color: z.string().optional().describe('Tag color'),
			notes: z.string().optional().describe('Tag notes'),
		},
		async ({ workspace_gid, name, color, notes }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTagApi(api).createTag(workspace_gid, name, { color, notes })),
				},
			],
		}),
	)

	server.tool(
		'asana_tag_update',
		'Update an Asana tag',
		{
			tag_gid: z.string().describe('Tag GID'),
			name: z.string().optional().describe('New tag name'),
			color: z.string().optional().describe('New tag color'),
			notes: z.string().optional().describe('New tag notes'),
		},
		async ({ tag_gid, name, color, notes }) => ({
			content: [
				{ type: 'text', text: JSON.stringify(await resolveTagApi(api).updateTag(tag_gid, { name, color, notes })) },
			],
		}),
	)

	server.tool(
		'asana_tag_delete',
		'Delete an Asana tag',
		{ tag_gid: z.string().describe('Tag GID') },
		async ({ tag_gid }) => {
			await resolveTagApi(api).deleteTag(tag_gid)
			return { content: [{ type: 'text', text: JSON.stringify({ ok: true, deleted: tag_gid }) }] }
		},
	)

	server.tool(
		'asana_tag_list_for_task',
		'List Asana tags for a task',
		{ task_gid: z.string().describe('Task GID'), ...paginationParams },
		async ({ task_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTagApi(api).listTagsForTask(task_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_tag_list_tasks',
		'List Asana tasks for a tag',
		{ tag_gid: z.string().describe('Tag GID'), ...paginationParams },
		async ({ tag_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveTagApi(api).listTasksForTag(tag_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_tag_add_to_task',
		'Add an Asana tag to a task',
		{
			task_gid: z.string().describe('Task GID'),
			tag_gid: z.string().describe('Tag GID'),
		},
		async ({ task_gid, tag_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveTagApi(api).addTagToTask(task_gid, tag_gid)) }],
		}),
	)

	server.tool(
		'asana_tag_remove_from_task',
		'Remove an Asana tag from a task',
		{
			task_gid: z.string().describe('Task GID'),
			tag_gid: z.string().describe('Tag GID'),
		},
		async ({ task_gid, tag_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveTagApi(api).removeTagFromTask(task_gid, tag_gid)) }],
		}),
	)
}
