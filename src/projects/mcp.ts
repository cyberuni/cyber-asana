import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createProject, deleteProject, getProject, listProjects, updateProject } from './api.js'

export function registerProjectTools(server: McpServer) {
	server.tool(
		'asana_project_list',
		'List Asana projects in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID') },
		async ({ workspace_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listProjects(workspace_gid)) }],
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
}
