import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DEFAULT_JOB_POLL_INTERVAL_MS } from '../job-polling.js'
import { paginationOptions, paginationParams, readOptions, readParams } from '../mcp-options.js'
import type { ProjectTemplateApi } from './api.js'
import {
	DEFAULT_INSTANTIATE_TIMEOUT_SECONDS,
	getProjectTemplate,
	instantiateProject,
	instantiateProjectAndWait,
	listProjectTemplates,
	listProjectTemplatesForTeam,
	newProjectOf,
} from './api.js'

function resolveProjectTemplateApi(api?: ProjectTemplateApi | (() => ProjectTemplateApi)): ProjectTemplateApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listProjectTemplates,
			listProjectTemplatesForTeam,
			getProjectTemplate,
			instantiateProject,
			instantiateProjectAndWait,
		}
	)
}

export function registerProjectTemplateTools(server: McpServer, api?: ProjectTemplateApi | (() => ProjectTemplateApi)) {
	server.tool(
		'asana_project_template_list',
		'List Asana project templates in a workspace or a team',
		{
			workspace_gid: z.string().optional().describe('Workspace GID'),
			team_gid: z.string().optional().describe('Team GID; takes precedence over workspace_gid'),
			...paginationParams,
		},
		async ({ workspace_gid, team_gid, ...params }) => {
			const opts = paginationOptions(params)
			const data = team_gid
				? await resolveProjectTemplateApi(api).listProjectTemplatesForTeam(team_gid, opts)
				: await resolveProjectTemplateApi(api).listProjectTemplates({ workspace: workspace_gid }, opts)
			return { content: [{ type: 'text', text: JSON.stringify(data) }] }
		},
	)

	server.tool(
		'asana_project_template_get',
		'Get an Asana project template by GID. Its requested_dates are the date variables instantiation can fill in',
		{ project_template_gid: z.string().describe('Project template GID'), ...readParams },
		async ({ project_template_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveProjectTemplateApi(api).getProjectTemplate(project_template_gid, readOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_project_template_instantiate',
		'Start a new Asana project from a project template. Asana builds the project asynchronously; by default this waits for the job and returns the new project GID, failing if the job failed or the bounded wait expired',
		{
			project_template_gid: z.string().describe('Project template GID'),
			name: z.string().describe('Name for the new project'),
			team_gid: z.string().optional().describe('Team GID for the new project; required in an organization'),
			public: z
				.boolean()
				.optional()
				.describe('Deprecated by Asana in favour of privacy_setting: whether the new project is visible to the team'),
			privacy_setting: z
				.enum(['public_to_workspace', 'private_to_team', 'private'])
				.optional()
				.describe('Privacy of the new project; Asana prefers this over the deprecated public flag'),
			requested_dates: z
				.array(z.object({ gid: z.string(), value: z.string() }))
				.optional()
				.describe("Values for the template's date variables, from the template's requested_dates"),
			requested_roles: z
				.array(z.object({ gid: z.string(), value: z.string() }))
				.optional()
				.describe('Users for the template\'s roles; value is a user GID, an email, or "me"'),
			is_strict: z
				.boolean()
				.optional()
				.describe('Fail the instantiation when a date variable is left unfilled instead of defaulting it'),
			wait: z
				.boolean()
				.optional()
				.describe('Wait for the job to finish (default true). With false, returns the job to poll yourself'),
			timeout_seconds: z
				.number()
				.positive()
				.optional()
				.describe(`Bound on the wait (default ${DEFAULT_INSTANTIATE_TIMEOUT_SECONDS} seconds)`),
		},
		async ({
			project_template_gid,
			name,
			team_gid,
			public: isPublic,
			privacy_setting,
			is_strict,
			requested_dates,
			requested_roles,
			wait,
			timeout_seconds,
		}) => {
			const fields = {
				name,
				...(team_gid !== undefined && { team: team_gid }),
				...(isPublic !== undefined && { public: isPublic }),
				...(privacy_setting !== undefined && { privacySetting: privacy_setting }),
				...(is_strict !== undefined && { isStrict: is_strict }),
				...(requested_dates !== undefined && { requestedDates: requested_dates }),
				...(requested_roles !== undefined && { requestedRoles: requested_roles }),
			}
			const templateApi = resolveProjectTemplateApi(api)
			const job =
				wait === false
					? await templateApi.instantiateProject(project_template_gid, fields)
					: await templateApi.instantiateProjectAndWait(project_template_gid, fields, {
							maxAttempts: timeout_seconds ?? DEFAULT_INSTANTIATE_TIMEOUT_SECONDS,
							intervalMs: DEFAULT_JOB_POLL_INTERVAL_MS,
						})
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify({ job, project_gid: newProjectOf(job)?.gid ?? null }),
					},
				],
			}
		},
	)
}
