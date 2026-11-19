import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DEFAULT_JOB_POLL_INTERVAL_MS } from '../platform/job-polling.js'
import {
	customTypeParam,
	paginationOptions,
	paginationParams,
	readOptions,
	readParams,
} from '../platform/mcp/options.js'
import { newProjectOf } from '../project-templates/api.js'
import { DEFAULT_DUPLICATE_TIMEOUT_SECONDS, type ProjectApi, renderProjectMarkdown } from './api.js'
import {
	addFollowersToProject,
	createProject,
	deleteProject,
	duplicateProject,
	duplicateProjectAndWait,
	exportProject,
	getProject,
	getProjectTaskCounts,
	listProjects,
	removeFollowersFromProject,
	searchProjects,
	updateProject,
} from './default.js'
import { PROJECT_ICONS, PROJECT_MINIMUM_ACCESS_LEVELS, PROJECT_RESOURCE_SUBTYPES } from './project-enums.js'
import { buildProjectCreateFields, buildProjectUpdateFields } from './write-options.js'

function resolveProjectApi(api?: ProjectApi | (() => ProjectApi)): ProjectApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listProjects,
			getProject,
			getProjectTaskCounts,
			createProject,
			updateProject,
			deleteProject,
			addFollowersToProject,
			removeFollowersFromProject,
			searchProjects,
			exportProject,
			duplicateProject,
			duplicateProjectAndWait,
		}
	)
}

/** The write fields `asana_project_create` and `asana_project_update` share. */
const projectWriteParams = {
	custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field values keyed by field GID'),
	html_custom_fields: z
		.record(z.string(), z.string())
		.optional()
		.describe('Text custom field values as HTML keyed by field GID, each wrapped in <body>...</body>'),
	custom_type: z.string().optional().describe('Custom type GID; Asana accepts it only when resource_subtype is custom'),
	resource_subtype: z.enum(PROJECT_RESOURCE_SUBTYPES).optional().describe('Project resource subtype'),
	icon: z.enum(PROJECT_ICONS).optional().describe('Project icon'),
	minimum_access_level_for_customization: z
		.enum(PROJECT_MINIMUM_ACCESS_LEVELS)
		.optional()
		.describe('Lowest access level that may customize the project'),
	minimum_access_level_for_sharing: z
		.enum(PROJECT_MINIMUM_ACCESS_LEVELS)
		.optional()
		.describe('Lowest access level that may share the project'),
}

type ProjectWriteParams = {
	custom_fields?: Record<string, unknown>
	html_custom_fields?: Record<string, string>
	custom_type?: string
	resource_subtype?: string
	icon?: string
	minimum_access_level_for_customization?: string
	minimum_access_level_for_sharing?: string
}

function projectWriteInputFromParams(params: ProjectWriteParams) {
	return {
		customFields: params.custom_fields,
		htmlCustomFields: params.html_custom_fields,
		customType: params.custom_type,
		resourceSubtype: params.resource_subtype,
		icon: params.icon,
		minAccessForCustomization: params.minimum_access_level_for_customization,
		minAccessForSharing: params.minimum_access_level_for_sharing,
	}
}

export function registerProjectTools(server: McpServer, api?: ProjectApi | (() => ProjectApi)) {
	server.tool(
		'asana_project_list',
		'List Asana projects in a workspace',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			archived: z.boolean().optional().describe('Only return projects whose archived flag matches this value'),
			custom_type: customTypeParam('projects'),
			...paginationParams,
		},
		async ({ workspace_gid, archived, custom_type, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveProjectApi(api).listProjects(workspace_gid, {
							...paginationOptions(params),
							...(archived !== undefined && { archived }),
							...(custom_type !== undefined && { customType: custom_type }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_project_get',
		'Get an Asana project by GID',
		{ project_gid: z.string().describe('Project GID'), ...readParams },
		async ({ project_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveProjectApi(api).getProject(project_gid, readOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_project_counts',
		'Get task counts for an Asana project',
		{
			project_gid: z.string().describe('Project GID'),
			opt_fields: z.string().optional().describe('Comma-separated task count fields to include'),
		},
		async ({ project_gid, opt_fields }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveProjectApi(api).getProjectTaskCounts(project_gid, { optFields: opt_fields }),
					),
				},
			],
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
			limit: z
				.number()
				.int()
				.min(1)
				.max(100)
				.optional()
				.describe('Results per call, from 1 to 100 (default: 100); search has no offset'),
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
			limit,
			opt_fields,
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveProjectApi(api).searchProjects(workspace_gid, {
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
							...(limit !== undefined && { limit }),
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
			...readParams,
			archived: z.boolean().optional().describe('Create the project already archived'),
			owner: z.string().optional().describe('Project owner — a user GID, an email, or "me"'),
			notes: z.string().optional().describe('Project notes'),
			html_notes: z.string().optional().describe('Project notes as HTML'),
			color: z.string().optional().describe('Project color'),
			privacy_setting: z
				.enum(['public_to_workspace', 'private_to_team', 'private'])
				.optional()
				.describe('Project privacy setting'),
			default_view: z.enum(['list', 'board', 'calendar', 'timeline']).optional().describe('Project default view'),
			default_access_level: z
				.enum(['admin', 'editor', 'commenter', 'viewer'])
				.optional()
				.describe('Default access for users or teams who join the project'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			start_on: z.string().optional().describe('Start date (YYYY-MM-DD)'),
			follower_gids: z
				.union([z.array(z.string()), z.string()])
				.optional()
				.describe(
					'Followers to add: user GIDs, emails, or "me"; set on create only (use asana_project_follower_add later)',
				),
			...projectWriteParams,
		},
		async ({
			workspace_gid,
			name,
			archived,
			owner,
			notes,
			html_notes,
			color,
			privacy_setting,
			default_view,
			default_access_level,
			due_on,
			start_on,
			follower_gids,
			opt_fields,
			...write
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveProjectApi(api).createProject(
							workspace_gid,
							name,
							buildProjectCreateFields({
								archived,
								owner,
								notes,
								htmlNotes: html_notes,
								color,
								privacySetting: privacy_setting,
								defaultView: default_view,
								defaultAccessLevel: default_access_level,
								dueOn: due_on,
								startOn: start_on,
								...(typeof follower_gids === 'string'
									? { followerInput: follower_gids }
									: { followerGids: follower_gids }),
								...projectWriteInputFromParams(write),
							}),
							readOptions({ opt_fields }),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_project_update',
		'Update an Asana project',
		{
			project_gid: z.string().describe('Project GID'),
			...readParams,
			name: z.string().optional().describe('New name'),
			archived: z.boolean().optional().describe('Archive (true) or unarchive (false) the project'),
			owner: z.string().optional().describe('New owner — a user GID, an email, or "me"'),
			clear_owner: z.boolean().optional().describe('Leave the project without an owner'),
			notes: z.string().optional().describe('New notes'),
			html_notes: z.string().optional().describe('New notes as HTML'),
			color: z.string().optional().describe('New color'),
			privacy_setting: z
				.enum(['public_to_workspace', 'private_to_team', 'private'])
				.optional()
				.describe('New project privacy setting'),
			default_view: z.enum(['list', 'board', 'calendar', 'timeline']).optional().describe('New default view'),
			default_access_level: z
				.enum(['admin', 'editor', 'commenter', 'viewer'])
				.optional()
				.describe('Default access for users or teams who join the project'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			start_on: z.string().optional().describe('Start date (YYYY-MM-DD)'),
			clear_due_on: z.boolean().optional().describe('Clear the due date'),
			clear_start_on: z.boolean().optional().describe('Clear the start date'),
			...projectWriteParams,
		},
		async ({
			project_gid,
			name,
			archived,
			owner,
			clear_owner,
			notes,
			html_notes,
			color,
			privacy_setting,
			default_view,
			default_access_level,
			due_on,
			start_on,
			clear_due_on,
			clear_start_on,
			opt_fields,
			...write
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveProjectApi(api).updateProject(
							project_gid,
							{
								...(name !== undefined && { name }),
								...buildProjectUpdateFields({
									archived,
									owner,
									clearOwner: clear_owner,
									notes,
									htmlNotes: html_notes,
									color,
									privacySetting: privacy_setting,
									defaultView: default_view,
									defaultAccessLevel: default_access_level,
									dueOn: due_on,
									startOn: start_on,
									clearDueOn: clear_due_on,
									clearStartOn: clear_start_on,
									...projectWriteInputFromParams(write),
								}),
							},
							readOptions({ opt_fields }),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_project_delete',
		'Delete an Asana project',
		{ project_gid: z.string().describe('Project GID') },
		async ({ project_gid }) => {
			await resolveProjectApi(api).deleteProject(project_gid)
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
			const data = await resolveProjectApi(api).exportProject(project_gid)
			const text = format === 'json' ? JSON.stringify(data) : renderProjectMarkdown(data)
			return { content: [{ type: 'text', text }] }
		},
	)

	server.tool(
		'asana_project_follower_add',
		'Add followers to an Asana project. Members are managed with asana_membership_create',
		{
			project_gid: z.string().describe('Project GID'),
			follower_gids: z.array(z.string()).describe('GIDs of users to add as followers'),
		},
		async ({ project_gid, follower_gids }) => {
			await resolveProjectApi(api).addFollowersToProject(project_gid, follower_gids)
			return {
				content: [{ type: 'text', text: `Added ${follower_gids.length} follower(s) to project ${project_gid}` }],
			}
		},
	)

	server.tool(
		'asana_project_follower_remove',
		'Remove followers from an Asana project',
		{
			project_gid: z.string().describe('Project GID'),
			follower_gids: z.array(z.string()).describe('GIDs of users to remove as followers'),
		},
		async ({ project_gid, follower_gids }) => {
			await resolveProjectApi(api).removeFollowersFromProject(project_gid, follower_gids)
			return {
				content: [{ type: 'text', text: `Removed ${follower_gids.length} follower(s) from project ${project_gid}` }],
			}
		},
	)

	server.tool(
		'asana_project_duplicate',
		'Duplicate an Asana project. Asana builds the copy asynchronously; by default this waits for the job and returns the new project GID, failing if the job failed or the bounded wait expired',
		{
			project_gid: z.string().describe('GID of the project to copy'),
			name: z.string().describe('Name for the new project'),
			team_gid: z.string().optional().describe('Team GID for the new project'),
			include: z
				.array(z.string())
				.optional()
				.describe('Elements to copy, such as members, task_notes, task_assignee, task_dates'),
			schedule_dates: z
				.object({
					should_skip_weekends: z.boolean().describe('Skip weekends when shifting dates'),
					start_on: z.string().optional().describe('Start the project on this date (YYYY-MM-DD)'),
					due_on: z.string().optional().describe('End the project on this date (YYYY-MM-DD)'),
				})
				.optional()
				.describe("Shift the copied tasks' dates: exactly one of start_on or due_on; needs task_dates in include"),
			wait: z.boolean().optional().describe('Wait for the copy to finish (default true); false returns the job'),
			timeout_seconds: z
				.number()
				.int()
				.positive()
				.optional()
				.describe(`Seconds to wait (default ${DEFAULT_DUPLICATE_TIMEOUT_SECONDS})`),
		},
		async ({ project_gid, name, team_gid, include, schedule_dates, wait, timeout_seconds }) => {
			const fields = {
				name,
				...(team_gid !== undefined && { team: team_gid }),
				...(include !== undefined && { include }),
				...(schedule_dates !== undefined && { schedule_dates }),
			}
			const projectApi = resolveProjectApi(api)
			const job =
				wait === false
					? await projectApi.duplicateProject(project_gid, fields)
					: await projectApi.duplicateProjectAndWait(project_gid, fields, {
							maxAttempts: timeout_seconds ?? DEFAULT_DUPLICATE_TIMEOUT_SECONDS,
							intervalMs: DEFAULT_JOB_POLL_INTERVAL_MS,
						})
			return {
				content: [{ type: 'text', text: JSON.stringify({ job, project_gid: newProjectOf(job)?.gid ?? null }) }],
			}
		},
	)
}
