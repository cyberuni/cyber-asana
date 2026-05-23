import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import { createTask, deleteTask, getTask, listTasks, scanTodos, searchTasks, updateTask } from './api.js'

export function registerTaskTools(server: McpServer) {
	server.tool(
		'asana_task_list',
		'List Asana tasks in a project',
		{
			project_gid: z.string().describe('Project GID'),
			completed_since: z
				.string()
				.optional()
				.describe('Only include tasks completed on or after this date (ISO 8601, or "now" for incomplete only)'),
			...paginationParams,
		},
		async ({ project_gid, completed_since, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await listTasks(project_gid, { completedSince: completed_since, ...paginationOptions(params) }),
					),
				},
			],
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
			text: z.string().optional().describe('Search text'),
			completed: z.boolean().optional().describe('Filter by completion status'),
			is_subtask: z.boolean().optional().describe('Filter subtasks only (true) or exclude subtasks (false)'),
			has_attachment: z.boolean().optional().describe('Only tasks with attachments'),
			is_blocking: z.boolean().optional().describe('Only tasks blocking other tasks'),
			is_blocked: z.boolean().optional().describe('Only tasks blocked by other tasks'),
			assignee_any: z.string().optional().describe('Comma-separated assignee GIDs (any match)'),
			projects_any: z.string().optional().describe('Comma-separated project GIDs (any match)'),
			sections_any: z.string().optional().describe('Comma-separated section GIDs (any match)'),
			tags_any: z.string().optional().describe('Comma-separated tag GIDs (any match)'),
			teams_any: z.string().optional().describe('Comma-separated team GIDs (any match)'),
			resource_subtype: z.string().optional().describe('Resource subtype filter (e.g. milestone)'),
			sort_by: z.string().optional().describe('Sort field: due_date, created_at, completed_at, likes, modified_at'),
			sort_ascending: z.boolean().optional().describe('Sort ascending (default: descending)'),
			opt_fields: z.string().optional().describe('Comma-separated optional Asana fields to include'),
		},
		async ({ workspace_gid, text, assignee_any, projects_any, sections_any, tags_any, teams_any, ...rest }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await searchTasks(workspace_gid, {
							text,
							assigneeAny: assignee_any,
							projectsAny: projects_any,
							sectionsAny: sections_any,
							tagsAny: tags_any,
							teamsAny: teams_any,
							completed: rest.completed,
							isSubtask: rest.is_subtask,
							hasAttachment: rest.has_attachment,
							isBlocking: rest.is_blocking,
							isBlocked: rest.is_blocked,
							resourceSubtype: rest.resource_subtype,
							sortBy: rest.sort_by,
							sortAscending: rest.sort_ascending,
							optFields: rest.opt_fields,
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_scan_todos',
		'Scan source files in a directory for TODO/FIXME/HACK/XXX comments and return structured results for LLM review',
		{
			dir: z.string().optional().describe('Root directory to scan (defaults to current working directory)'),
			extensions: z.string().optional().describe('Comma-separated file extensions to scan (e.g. ".ts,.py")'),
			exclude: z.string().optional().describe('Comma-separated directory names to skip (e.g. "node_modules,dist")'),
		},
		async ({ dir, extensions, exclude }) => {
			const root = dir ?? process.cwd()
			const data = await scanTodos(root, {
				extensions: extensions?.split(',').map((e) => e.trim()),
				exclude: exclude?.split(',').map((e) => e.trim()),
			})
			return { content: [{ type: 'text', text: JSON.stringify(data) }] }
		},
	)
}
