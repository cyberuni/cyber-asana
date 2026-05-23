import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createTask, deleteTask, getTask, listTasks, searchTasks, updateTask } from './api.js'

export function registerTaskTools(server: McpServer) {
	server.tool(
		'asana_task_list',
		'List Asana tasks in a project',
		{ project_gid: z.string().describe('Project GID') },
		async ({ project_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listTasks(project_gid)) }],
		}),
	)

	server.tool(
		'asana_task_get',
		'Get an Asana task by GID',
		{ task_gid: z.string().describe('Task GID') },
		async ({ task_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getTask(task_gid)) }],
		}),
	)

	server.tool(
		'asana_task_create',
		'Create a new Asana task',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Task name'),
			project_gid: z.string().optional().describe('Project GID'),
			assignee_gid: z.string().optional().describe('Assignee user GID'),
			notes: z.string().optional().describe('Task notes'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
		},
		async ({ workspace_gid, name, project_gid, assignee_gid, notes, due_on }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await createTask(workspace_gid, name, {
							notes,
							assignee: assignee_gid,
							projects: project_gid ? [project_gid] : undefined,
							due_on,
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_update',
		'Update an Asana task',
		{
			task_gid: z.string().describe('Task GID'),
			name: z.string().optional().describe('New name'),
			notes: z.string().optional().describe('New notes'),
			completed: z.boolean().optional().describe('Mark as completed'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			assignee_gid: z.string().optional().describe('Assignee user GID'),
		},
		async ({ task_gid, assignee_gid, ...fields }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await updateTask(task_gid, { ...fields, assignee: assignee_gid })),
				},
			],
		}),
	)

	server.tool(
		'asana_task_delete',
		'Delete an Asana task',
		{ task_gid: z.string().describe('Task GID') },
		async ({ task_gid }) => {
			await deleteTask(task_gid)
			return { content: [{ type: 'text', text: `Deleted task ${task_gid}` }] }
		},
	)

	server.tool(
		'asana_task_search',
		'Search Asana tasks in a workspace',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			text: z.string().describe('Search text'),
		},
		async ({ workspace_gid, text }) => ({
			content: [{ type: 'text', text: JSON.stringify(await searchTasks(workspace_gid, text)) }],
		}),
	)
}
