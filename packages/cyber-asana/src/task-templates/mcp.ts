import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DEFAULT_JOB_POLL_ATTEMPTS, DEFAULT_JOB_POLL_INTERVAL_MS } from '../job-polling.js'
import { paginationOptions, paginationParams, readOptions, readParams } from '../mcp-options.js'
import type { TaskTemplateApi } from './api.js'
import { getTaskTemplate, instantiateTask, listTaskTemplates } from './api.js'

function resolveTaskTemplateApi(api?: TaskTemplateApi | (() => TaskTemplateApi)): TaskTemplateApi {
	if (typeof api === 'function') return api()
	return api ?? { listTaskTemplates, getTaskTemplate, instantiateTask }
}

export function registerTaskTemplateTools(server: McpServer, api?: TaskTemplateApi | (() => TaskTemplateApi)) {
	server.tool(
		'asana_task_template_list',
		'List Asana task templates in a project',
		{ project_gid: z.string().describe('Project GID'), ...paginationParams },
		async ({ project_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveTaskTemplateApi(api).listTaskTemplates(project_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_template_get',
		'Get an Asana task template by GID',
		{ task_template_gid: z.string().describe('Task template GID'), ...readParams },
		async ({ task_template_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveTaskTemplateApi(api).getTaskTemplate(task_template_gid, readOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_task_template_instantiate',
		'Create an Asana task from a task template. Returns the instantiation job; when it has succeeded the job carries new_task',
		{
			task_template_gid: z.string().describe('Task template GID'),
			name: z.string().optional().describe('Name for the created task (defaults to the template name)'),
			wait: z.boolean().optional().describe('Poll the job until the task exists (default: true)'),
			timeout_seconds: z
				.number()
				.int()
				.min(1)
				.optional()
				.describe(`Seconds to poll before returning the pending job (default: ${DEFAULT_JOB_POLL_ATTEMPTS})`),
		},
		async ({ task_template_gid, name, wait, timeout_seconds }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveTaskTemplateApi(api).instantiateTask(
							task_template_gid,
							{ ...(name !== undefined && { name }) },
							{
								maxAttempts: wait === false ? 0 : (timeout_seconds ?? DEFAULT_JOB_POLL_ATTEMPTS),
								intervalMs: DEFAULT_JOB_POLL_INTERVAL_MS,
							},
						),
					),
				},
			],
		}),
	)
}
