import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import {
	createProject,
	deleteProject,
	exportProject,
	getProject,
	listProjects,
	renderProjectMarkdown,
	searchProjects,
	updateProject,
} from './api.js'

export function registerProjectTools(server: McpServer) {
	server.tool(
		'asana_project_list',
		'List Asana projects in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listProjects(workspace_gid, paginationOptions(params))) }],
		}),
	)

	server.tool(
		'asana_project_get',
		'Get an Asana project by GID',
		{ project_gid: z.string().describe('Project GID') },
		async ({ project_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getProject(project_gid)) }],
		}),
	)

	server.tool(
		'asana_project_search',
		'Search Asana projects in a workspace',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			text: z.string().optional().describe('Search text'),
			completed: z.boolean().optional().describe('Filter by completion status'),
			teams_any: z.string().optional().describe('Comma-separated team GIDs (any match)'),
			owner_any: z.string().optional().describe('Comma-separated owner identifiers (any match)'),
			members_any: z.string().optional().describe('Comma-separated member identifiers (any match)'),
			members_not: z.string().optional().describe('Comma-separated member identifiers to exclude'),
			portfolios_any: z.string().optional().describe('Comma-separated portfolio GIDs (any match)'),
			completed_on: z.string().optional().describe('Exact completion date (YYYY-MM-DD)'),
			completed_on_before: z.string().optional().describe('Completion date before (YYYY-MM-DD)'),
			completed_on_after: z.string().optional().describe('Completion date after (YYYY-MM-DD)'),
			completed_at_before: z.string().optional().describe('Completion datetime before (ISO 8601)'),
			completed_at_after: z.string().optional().describe('Completion datetime after (ISO 8601)'),
			created_on: z.string().optional().describe('Exact creation date (YYYY-MM-DD)'),
			created_on_before: z.string().optional().describe('Creation date before (YYYY-MM-DD)'),
			created_on_after: z.string().optional().describe('Creation date after (YYYY-MM-DD)'),
			created_at_before: z.string().optional().describe('Creation datetime before (ISO 8601)'),
			created_at_after: z.string().optional().describe('Creation datetime after (ISO 8601)'),
			due_on: z.string().optional().describe('Exact due date (YYYY-MM-DD)'),
			due_on_before: z.string().optional().describe('Due date before (YYYY-MM-DD)'),
			due_on_after: z.string().optional().describe('Due date after (YYYY-MM-DD)'),
			due_at_before: z.string().optional().describe('Due datetime before (ISO 8601)'),
			due_at_after: z.string().optional().describe('Due datetime after (ISO 8601)'),
			start_on: z.string().optional().describe('Exact start date (YYYY-MM-DD)'),
			start_on_before: z.string().optional().describe('Start date before (YYYY-MM-DD)'),
			start_on_after: z.string().optional().describe('Start date after (YYYY-MM-DD)'),
			sort_by: z.string().optional().describe('Sort field: due_date, created_at, completed_at, modified_at'),
			sort_ascending: z.boolean().optional().describe('Sort ascending (default: descending)'),
			opt_fields: z.string().optional().describe('Comma-separated optional Asana fields to include'),
		},
		async ({
			workspace_gid,
			text,
			completed,
			teams_any,
			owner_any,
			members_any,
			members_not,
			portfolios_any,
			completed_on,
			completed_on_before,
			completed_on_after,
			completed_at_before,
			completed_at_after,
			created_on,
			created_on_before,
			created_on_after,
			created_at_before,
			created_at_after,
			due_on,
			due_on_before,
			due_on_after,
			due_at_before,
			due_at_after,
			start_on,
			start_on_before,
			start_on_after,
			sort_by,
			sort_ascending,
			opt_fields,
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await searchProjects(workspace_gid, {
							text,
							completed,
							teamsAny: teams_any,
							ownerAny: owner_any,
							membersAny: members_any,
							membersNot: members_not,
							portfoliosAny: portfolios_any,
							completedOn: completed_on,
							completedOnBefore: completed_on_before,
							completedOnAfter: completed_on_after,
							completedAtBefore: completed_at_before,
							completedAtAfter: completed_at_after,
							createdOn: created_on,
							createdOnBefore: created_on_before,
							createdOnAfter: created_on_after,
							createdAtBefore: created_at_before,
							createdAtAfter: created_at_after,
							dueOn: due_on,
							dueOnBefore: due_on_before,
							dueOnAfter: due_on_after,
							dueAtBefore: due_at_before,
							dueAtAfter: due_at_after,
							startOn: start_on,
							startOnBefore: start_on_before,
							startOnAfter: start_on_after,
							sortBy: sort_by,
							sortAscending: sort_ascending,
							optFields: opt_fields,
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_project_create',
		'Create a new Asana project',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Project name'),
			notes: z.string().optional().describe('Project notes'),
			color: z.string().optional().describe('Project color'),
		},
		async ({ workspace_gid, name, notes, color }) => ({
			content: [{ type: 'text', text: JSON.stringify(await createProject(workspace_gid, name, { notes, color })) }],
		}),
	)

	server.tool(
		'asana_project_update',
		'Update an Asana project',
		{
			project_gid: z.string().describe('Project GID'),
			name: z.string().optional().describe('New name'),
			notes: z.string().optional().describe('New notes'),
			color: z.string().optional().describe('New color'),
		},
		async ({ project_gid, ...fields }) => ({
			content: [{ type: 'text', text: JSON.stringify(await updateProject(project_gid, fields)) }],
		}),
	)

	server.tool(
		'asana_project_delete',
		'Delete an Asana project',
		{ project_gid: z.string().describe('Project GID') },
		async ({ project_gid }) => {
			await deleteProject(project_gid)
			return { content: [{ type: 'text', text: `Deleted project ${project_gid}` }] }
		},
	)

	server.tool(
		'asana_project_export',
		'Export an Asana project with all sections and tasks as structured data or markdown',
		{
			project_gid: z.string().describe('Project GID'),
			format: z.enum(['json', 'markdown']).optional().describe('Output format (default: markdown)'),
		},
		async ({ project_gid, format }) => {
			const data = await exportProject(project_gid)
			const text = format === 'json' ? JSON.stringify(data) : renderProjectMarkdown(data)
			return { content: [{ type: 'text', text }] }
		},
	)
}
