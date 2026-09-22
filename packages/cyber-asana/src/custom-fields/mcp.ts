import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../mcp-options.js'
import type { CustomFieldApi } from './api.js'
import {
	getCustomField,
	listCustomFieldSettingsForGoal,
	listCustomFieldSettingsForPortfolio,
	listCustomFieldSettingsForProject,
	listCustomFieldSettingsForTeam,
	listCustomFields,
} from './api.js'

function resolveCustomFieldApi(api?: CustomFieldApi | (() => CustomFieldApi)): CustomFieldApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listCustomFields,
			getCustomField,
			listCustomFieldSettingsForProject,
			listCustomFieldSettingsForPortfolio,
			listCustomFieldSettingsForGoal,
			listCustomFieldSettingsForTeam,
		}
	)
}

export function registerCustomFieldTools(server: McpServer, api?: CustomFieldApi | (() => CustomFieldApi)) {
	server.tool(
		'asana_custom_field_list',
		"List a workspace's custom fields — use this to find the field GIDs that asana_task_create and asana_task_update expect in custom_fields",
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFields(workspace_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_get',
		'Get an Asana custom field by GID, including its enum options and their GIDs',
		{ custom_field_gid: z.string().describe('Custom field GID'), ...readParams },
		async ({ custom_field_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveCustomFieldApi(api).getCustomField(custom_field_gid, readOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_project',
		'List the Asana custom fields attached to a project, with their enum options — the fields actually usable on tasks in that project, and narrower than asana_custom_field_list',
		{ project_gid: z.string().describe('Project GID'), ...paginationParams },
		async ({ project_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForProject(project_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_portfolio',
		'List the Asana custom fields attached to a portfolio, with their enum options',
		{ portfolio_gid: z.string().describe('Portfolio GID'), ...paginationParams },
		async ({ portfolio_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForPortfolio(
							portfolio_gid,
							paginationOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_goal',
		'List the Asana custom fields attached to a goal, with their enum options',
		{ goal_gid: z.string().describe('Goal GID'), ...paginationParams },
		async ({ goal_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForGoal(goal_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_custom_field_list_for_team',
		'List the Asana custom fields attached to a team, with their enum options',
		{ team_gid: z.string().describe('Team GID'), ...paginationParams },
		async ({ team_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveCustomFieldApi(api).listCustomFieldSettingsForTeam(team_gid, paginationOptions(params)),
					),
				},
			],
		}),
	)
}
