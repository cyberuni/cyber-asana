import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { readOptions, readParams } from '../mcp-options.js'
import type { JobApi } from './api.js'
import { getJob } from './api.js'

function resolveJobApi(api?: JobApi | (() => JobApi)): JobApi {
	if (typeof api === 'function') return api()
	return api ?? { getJob }
}

export function registerJobTools(server: McpServer, api?: JobApi | (() => JobApi)) {
	server.tool(
		'asana_job_get',
		'Get an Asana async job by GID. Status is one of not_started, in_progress, succeeded, failed; a succeeded job carries the resource it produced (e.g. new_project)',
		{ job_gid: z.string().describe('Job GID'), ...readParams },
		async ({ job_gid, ...params }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveJobApi(api).getJob(job_gid, readOptions(params))) }],
		}),
	)
}
