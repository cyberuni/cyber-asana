import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../mcp-options.js'
import type { SectionApi } from './api.js'
import {
	addTaskToSection,
	createSection,
	deleteSection,
	getSection,
	listSections,
	moveSection,
	updateSection,
} from './api.js'

function resolveSectionApi(api?: SectionApi | (() => SectionApi)): SectionApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listSections,
			getSection,
			createSection,
			updateSection,
			deleteSection,
			moveSection,
			addTaskToSection,
		}
	)
}

export function registerSectionTools(server: McpServer, api?: SectionApi | (() => SectionApi)) {
	server.tool(
		'asana_section_list',
		'List Asana sections in a project',
		{ project_gid: z.string().describe('Project GID'), ...paginationParams },
		async ({ project_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveSectionApi(api).listSections(project_gid, paginationOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_section_get',
		'Get an Asana section by GID',
		{ section_gid: z.string().describe('Section GID'), ...readParams },
		async ({ section_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveSectionApi(api).getSection(section_gid, readOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_section_create',
		'Create an Asana section in a project, optionally at a specific position',
		{
			project_gid: z.string().describe('Project GID'),
			name: z.string().describe('Section name'),
			insert_before: z.string().optional().describe('Section GID to insert before'),
			insert_after: z.string().optional().describe('Section GID to insert after'),
		},
		async ({ project_gid, name, insert_before, insert_after }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveSectionApi(api).createSection(project_gid, name, {
							insertBefore: insert_before,
							insertAfter: insert_after,
						}),
					),
				},
			],
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
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveSectionApi(api).updateSection(section_gid, name)),
				},
			],
		}),
	)

	server.tool(
		'asana_section_move',
		'Move an Asana section before or after another section in the same project',
		{
			project_gid: z.string().describe('Project GID'),
			section_gid: z.string().describe('Section GID to move'),
			insert_before: z.string().optional().describe('Section GID to insert before'),
			insert_after: z.string().optional().describe('Section GID to insert after'),
		},
		async ({ project_gid, section_gid, insert_before, insert_after }) => {
			await resolveSectionApi(api).moveSection(project_gid, section_gid, {
				insertBefore: insert_before,
				insertAfter: insert_after,
			})
			return { content: [{ type: 'text', text: `Moved section ${section_gid} in project ${project_gid}` }] }
		},
	)

	server.tool(
		'asana_section_task_add',
		'Add an Asana task directly to a section, optionally at a specific position',
		{
			section_gid: z.string().describe('Section GID'),
			task_gid: z.string().describe('Task GID'),
			insert_before: z.string().optional().describe('Task GID to insert before'),
			insert_after: z.string().optional().describe('Task GID to insert after'),
		},
		async ({ section_gid, task_gid, insert_before, insert_after }) => {
			await resolveSectionApi(api).addTaskToSection(section_gid, task_gid, {
				insertBefore: insert_before,
				insertAfter: insert_after,
			})
			return { content: [{ type: 'text', text: `Added task ${task_gid} to section ${section_gid}` }] }
		},
	)

	server.tool(
		'asana_section_delete',
		'Delete an Asana section',
		{ section_gid: z.string().describe('Section GID') },
		async ({ section_gid }) => {
			await resolveSectionApi(api).deleteSection(section_gid)
			return { content: [{ type: 'text', text: `Deleted section ${section_gid}` }] }
		},
	)
}
