import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { deleteIdempotently } from '../platform/idempotent-delete.js'
import { readOptions, readParams } from '../platform/mcp/options.js'
import type { ProjectBriefApi, ProjectBriefFields } from './api.js'
import { createProjectBrief, deleteProjectBrief, getProjectBrief, updateProjectBrief } from './default.js'

function resolveProjectBriefApi(api?: ProjectBriefApi | (() => ProjectBriefApi)): ProjectBriefApi {
	if (typeof api === 'function') return api()
	return api ?? { getProjectBrief, createProjectBrief, updateProjectBrief, deleteProjectBrief }
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

const writeParams = {
	...readParams,
	title: z.string().optional().describe('Brief title'),
	text: z.string().optional().describe('Brief body as plain text'),
	html_text: z
		.string()
		.optional()
		.describe(
			'Brief body as Asana rich text HTML (preferred over text). Wrap it in <body>; use <h1>-<h3>, <strong>, <em>, <code>, <ul>, <ol>, <li>, <a>, <blockquote>, <hr/>. <p>, <br> and <div> are refused',
		),
}

function fieldsFrom(params: { title?: string; text?: string; html_text?: string }): ProjectBriefFields {
	return {
		...(params.title !== undefined && { title: params.title }),
		...(params.text !== undefined && { text: params.text }),
		...(params.html_text !== undefined && { html_text: params.html_text }),
	}
}

export function registerProjectBriefTools(server: McpServer, api?: ProjectBriefApi | (() => ProjectBriefApi)) {
	server.tool(
		'asana_project_brief_get',
		"Get an Asana project brief (the project's charter or sprint goal) by GID",
		{ project_brief_gid: z.string().describe('Project brief GID'), ...readParams },
		async ({ project_brief_gid, ...params }) =>
			json(await resolveProjectBriefApi(api).getProjectBrief(project_brief_gid, readOptions(params))),
	)

	server.tool(
		'asana_project_brief_create',
		'Create the brief of an Asana project (a project holds one brief). Rich text is checked against the project-brief HTML rules before it is sent',
		{ project_gid: z.string().describe('Project GID the brief belongs to'), ...writeParams },
		async ({ project_gid, ...params }) =>
			json(await resolveProjectBriefApi(api).createProjectBrief(project_gid, fieldsFrom(params), readOptions(params))),
	)

	server.tool(
		'asana_project_brief_update',
		'Update an Asana project brief. Give at least one of title, text, html_text',
		{ project_brief_gid: z.string().describe('Project brief GID'), ...writeParams },
		async ({ project_brief_gid, ...params }) => {
			const fields = fieldsFrom(params)
			if (Object.keys(fields).length === 0) {
				throw new Error('Nothing to update: give at least one of title, text, html_text')
			}
			return json(await resolveProjectBriefApi(api).updateProjectBrief(project_brief_gid, fields, readOptions(params)))
		},
	)

	server.tool(
		'asana_project_brief_delete',
		'Delete an Asana project brief. Succeeds with already_absent when it is already gone',
		{ project_brief_gid: z.string().describe('Project brief GID') },
		async ({ project_brief_gid }) =>
			json(
				await deleteIdempotently('project_brief', project_brief_gid, () =>
					resolveProjectBriefApi(api).deleteProjectBrief(project_brief_gid),
				),
			),
	)
}
