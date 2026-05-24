import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
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
			color: z.string().optional().describe('Tag color'),
			notes: z.string().optional().describe('Tag notes'),
		},
		async ({ workspace_gid, name, color, notes }) => ({
			content: [{ type: 'text', text: JSON.stringify(await createTag(workspace_gid, name, { color, notes })) }],
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
			content: [{ type: 'text', text: JSON.stringify(await updateTag(tag_gid, { name, color, notes })) }],
		}),
	)

	server.tool(
		'asana_tag_delete',
		'Delete an Asana tag',
		{ tag_gid: z.string().describe('Tag GID') },
		async ({ tag_gid }) => {
			await deleteTag(tag_gid)
			return { content: [{ type: 'text', text: JSON.stringify({ ok: true, deleted: tag_gid }) }] }
		},
	)

	server.tool(
		'asana_tag_list_for_task',
		'List Asana tags for a task',
		{ task_gid: z.string().describe('Task GID'), ...paginationParams },
		async ({ task_gid, ...params }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listTagsForTask(task_gid, paginationOptions(params))) }],
		}),
	)

	server.tool(
		'asana_tag_list_tasks',
		'List Asana tasks for a tag',
		{ tag_gid: z.string().describe('Tag GID'), ...paginationParams },
		async ({ tag_gid, ...params }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listTasksForTag(tag_gid, paginationOptions(params))) }],
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
			content: [{ type: 'text', text: JSON.stringify(await addTagToTask(task_gid, tag_gid)) }],
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
			content: [{ type: 'text', text: JSON.stringify(await removeTagFromTask(task_gid, tag_gid)) }],
		}),
	)
}
