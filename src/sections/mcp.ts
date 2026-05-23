import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { createSection, deleteSection, getSection, listSections, updateSection } from './api.js'

export function registerSectionTools(server: McpServer) {
	server.tool(
		'asana_section_list',
		'List Asana sections in a project',
		{ project_gid: z.string().describe('Project GID') },
		async ({ project_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await listSections(project_gid)) }],
		}),
	)

	server.tool(
		'asana_section_get',
		'Get an Asana section by GID',
		{ section_gid: z.string().describe('Section GID') },
		async ({ section_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await getSection(section_gid)) }],
		}),
	)

	server.tool(
		'asana_section_create',
		'Create an Asana section in a project',
		{
			project_gid: z.string().describe('Project GID'),
			name: z.string().describe('Section name'),
		},
		async ({ project_gid, name }) => ({
			content: [{ type: 'text', text: JSON.stringify(await createSection(project_gid, name)) }],
		}),
	)

	server.tool(
		'asana_section_update',
		'Update an Asana section',
		{
			section_gid: z.string().describe('Section GID'),
			name: z.string().describe('New name'),
		},
		async ({ section_gid, name }) => ({
			content: [{ type: 'text', text: JSON.stringify(await updateSection(section_gid, name)) }],
		}),
	)

	server.tool(
		'asana_section_delete',
		'Delete an Asana section',
		{ section_gid: z.string().describe('Section GID') },
		async ({ section_gid }) => {
			await deleteSection(section_gid)
			return { content: [{ type: 'text', text: `Deleted section ${section_gid}` }] }
		},
	)
}
