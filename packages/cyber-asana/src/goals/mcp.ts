import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { GoalApi, GoalMetricInput } from './api.js'
import {
	addGoalFollowers,
	addSupportingRelationship,
	createGoal,
	deleteGoal,
	getGoal,
	getTimePeriod,
	listGoals,
	listTimePeriods,
	removeGoalFollowers,
	removeSupportingRelationship,
	setGoalMetric,
	setGoalMetricCurrentValue,
	updateGoal,
} from './default.js'
import { GOAL_STATUSES } from './gateway.js'
import { buildGoalCreateFields, buildGoalUpdateFields } from './write-options.js'

function resolveGoalApi(api?: GoalApi | (() => GoalApi)): GoalApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listGoals,
			getGoal,
			createGoal,
			updateGoal,
			deleteGoal,
			listTimePeriods,
			getTimePeriod,
			setGoalMetric,
			setGoalMetricCurrentValue,
			addSupportingRelationship,
			removeSupportingRelationship,
			addGoalFollowers,
			removeGoalFollowers,
		}
	)
}

function listOf(value?: string | string[]) {
	const items = (typeof value === 'string' ? value.split(',') : (value ?? [])).map((v) => v.trim()).filter(Boolean)
	return items.length > 0 ? items : undefined
}

const goalWriteParams = {
	time_period_gid: z.string().optional().describe('Time period GID (see asana_time_period_list)'),
	owner_gid: z.string().optional().describe('Owner user GID'),
	team_gid: z.string().optional().describe('Team GID; Asana honours it only in an organization'),
	is_workspace_level: z
		.boolean()
		.optional()
		.describe('Workspace-level goal (true) or team goal (false); organization only'),
	liked: z.boolean().optional().describe('Like (true) or unlike (false) the goal'),
}

type GoalWriteParams = {
	time_period_gid?: string
	owner_gid?: string
	team_gid?: string
	is_workspace_level?: boolean
	liked?: boolean
}

function goalWriteInput(p: GoalWriteParams) {
	return {
		timePeriod: p.time_period_gid,
		owner: p.owner_gid,
		team: p.team_gid,
		isWorkspaceLevel: p.is_workspace_level,
		liked: p.liked,
	}
}

export function registerGoalTools(server: McpServer, api?: GoalApi | (() => GoalApi)) {
	server.tool(
		'asana_goal_list',
		'List Asana goals in a workspace, or by portfolio, project, task or team',
		{
			workspace_gid: z
				.string()
				.optional()
				.describe('Workspace GID; required unless portfolio_gid, project_gid, task_gid or team_gid is given'),
			portfolio_gid: z.string().optional().describe('Supporting portfolio GID'),
			project_gid: z.string().optional().describe('Supporting project GID'),
			task_gid: z.string().optional().describe('Supporting task GID'),
			team_gid: z.string().optional().describe('Team GID'),
			is_workspace_level: z
				.boolean()
				.optional()
				.describe('Only workspace-level goals (true) or not (false); needs workspace_gid'),
			time_period_gids: z
				.union([z.array(z.string()), z.string()])
				.optional()
				.describe('Only goals in these time periods: GIDs, as an array or comma-separated'),
			...paginationParams,
		},
		async ({
			workspace_gid,
			portfolio_gid,
			project_gid,
			task_gid,
			team_gid,
			is_workspace_level,
			time_period_gids,
			...params
		}) => {
			const timePeriods = listOf(time_period_gids)
			const opts = {
				...paginationOptions(params),
				...(portfolio_gid !== undefined && { portfolio: portfolio_gid }),
				...(project_gid !== undefined && { project: project_gid }),
				...(task_gid !== undefined && { task: task_gid }),
				...(team_gid !== undefined && { team: team_gid }),
				...(is_workspace_level !== undefined && { isWorkspaceLevel: is_workspace_level }),
				...(timePeriods && { timePeriods }),
			}
			return {
				content: [{ type: 'text', text: JSON.stringify(await resolveGoalApi(api).listGoals(workspace_gid, opts)) }],
			}
		},
	)

	server.tool(
		'asana_time_period_list',
		'List the time periods of a workspace; a goal belongs to one (paid plan)',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			start_on: z.string().optional().describe('Only periods starting on or after this date (YYYY-MM-DD)'),
			end_on: z.string().optional().describe('Only periods ending on or before this date (YYYY-MM-DD)'),
			...paginationParams,
		},
		async ({ workspace_gid, start_on, end_on, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).listTimePeriods(workspace_gid, {
							...paginationOptions(params),
							...(start_on !== undefined && { startOn: start_on }),
							...(end_on !== undefined && { endOn: end_on }),
						}),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_time_period_get',
		'Get an Asana time period by GID',
		{ time_period_gid: z.string().describe('Time period GID'), ...readParams },
		async ({ time_period_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveGoalApi(api).getTimePeriod(time_period_gid, readOptions(params))),
				},
			],
		}),
	)

	server.tool(
		'asana_goal_get',
		'Get an Asana goal by GID',
		{ goal_gid: z.string().describe('Goal GID'), ...readParams },
		async ({ goal_gid, ...params }) => ({
			content: [
				{ type: 'text', text: JSON.stringify(await resolveGoalApi(api).getGoal(goal_gid, readOptions(params))) },
			],
		}),
	)

	server.tool(
		'asana_goal_create',
		'Create an Asana goal',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Goal name'),
			notes: z.string().optional().describe('Goal notes'),
			html_notes: z.string().optional().describe('Goal notes as Asana rich text HTML'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			start_on: z.string().optional().describe('Start date (YYYY-MM-DD); Asana requires an accompanying due date'),
			follower_gids: z
				.union([z.array(z.string()), z.string()])
				.optional()
				.describe(
					'Followers to add: user GIDs, emails, or "me"; set on create only (use asana_goal_follower_add later)',
				),
			...goalWriteParams,
			...readParams,
		},
		async ({ workspace_gid, name, notes, html_notes, due_on, start_on, follower_gids, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).createGoal(
							workspace_gid,
							name,
							buildGoalCreateFields({
								notes,
								htmlNotes: html_notes,
								dueOn: due_on,
								startOn: start_on,
								...(typeof follower_gids === 'string'
									? { followerInput: follower_gids }
									: { followerGids: follower_gids }),
								...goalWriteInput(params),
							}),
							readOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_goal_update',
		'Update an Asana goal',
		{
			goal_gid: z.string().describe('Goal GID'),
			name: z.string().optional().describe('New name'),
			notes: z.string().optional().describe('New notes'),
			html_notes: z.string().optional().describe('New notes as Asana rich text HTML'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
			clear_due_on: z.boolean().optional().describe('Clear the due date'),
			start_on: z.string().optional().describe('Start date (YYYY-MM-DD); Asana requires an accompanying due date'),
			clear_start_on: z.boolean().optional().describe('Clear the start date'),
			status: z
				.enum(GOAL_STATUSES)
				.optional()
				.describe(
					'Status: green, yellow, red while open; missed, achieved, partial, dropped when closed. Asana accepts it only when the goal has a metric',
				),
			custom_fields: z.record(z.string(), z.unknown()).optional().describe('Custom field values keyed by field GID'),
			html_custom_fields: z
				.record(z.string(), z.string())
				.optional()
				.describe('Text custom field values as HTML (Asana rich text subset), keyed by field GID'),
			...goalWriteParams,
			...readParams,
		},
		async ({
			goal_gid,
			name,
			notes,
			html_notes,
			due_on,
			clear_due_on,
			start_on,
			clear_start_on,
			status,
			custom_fields,
			html_custom_fields,
			...params
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).updateGoal(
							goal_gid,
							buildGoalUpdateFields({
								name,
								notes,
								htmlNotes: html_notes,
								dueOn: due_on,
								clearDueOn: clear_due_on,
								startOn: start_on,
								clearStartOn: clear_start_on,
								status,
								customFields: custom_fields,
								htmlCustomFields: html_custom_fields,
								...goalWriteInput(params),
							}),
							readOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_goal_delete',
		'Delete an Asana goal',
		{ goal_gid: z.string().describe('Goal GID') },
		async ({ goal_gid }) => {
			await resolveGoalApi(api).deleteGoal(goal_gid)
			return { content: [{ type: 'text', text: `Deleted goal ${goal_gid}` }] }
		},
	)

	server.tool(
		'asana_goal_metric_set',
		'Set the metric of an Asana goal: unit, precision, and initial, target, and current values (paid plan)',
		{
			goal_gid: z.string().describe('Goal GID'),
			unit: z.enum(['none', 'currency', 'percentage']).optional().describe('Metric unit'),
			precision: z.number().optional().describe('Decimal places'),
			currency_code: z.string().optional().describe('ISO 4217 currency code, for unit currency'),
			initial_number_value: z.number().optional().describe('Initial value'),
			target_number_value: z.number().optional().describe('Target value'),
			current_number_value: z.number().optional().describe('Current value'),
			progress_source: z.string().optional().describe('Where progress comes from, such as manual'),
			is_custom_weight: z
				.boolean()
				.optional()
				.describe(
					'Weight the supporting resources yourself; relevant only for the subgoal_progress, project_task_completion, project_milestone_completion and task_completion progress sources',
				),
			...readParams,
		},
		async ({
			goal_gid,
			unit,
			precision,
			currency_code,
			initial_number_value,
			target_number_value,
			current_number_value,
			progress_source,
			is_custom_weight,
			...params
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).setGoalMetric(
							goal_gid,
							{
								...(unit !== undefined && { unit }),
								...(precision !== undefined && { precision }),
								...(currency_code !== undefined && { currencyCode: currency_code }),
								...(initial_number_value !== undefined && { initialNumberValue: initial_number_value }),
								...(target_number_value !== undefined && { targetNumberValue: target_number_value }),
								...(current_number_value !== undefined && { currentNumberValue: current_number_value }),
								...(progress_source !== undefined && {
									progressSource: progress_source as GoalMetricInput['progressSource'],
								}),
								...(is_custom_weight !== undefined && { isCustomWeight: is_custom_weight }),
							},
							readOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_goal_metric_set_current_value',
		"Record the current value of an Asana goal's metric (paid plan)",
		{
			goal_gid: z.string().describe('Goal GID'),
			current_number_value: z.number().describe('Current value'),
			...readParams,
		},
		async ({ goal_gid, current_number_value, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).setGoalMetricCurrentValue(goal_gid, current_number_value, readOptions(params)),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_goal_supporting_add',
		'Make an Asana goal, project, or portfolio support a goal (paid plan)',
		{
			goal_gid: z.string().describe('Goal GID being supported'),
			supporting_resource_gid: z.string().describe('GID of the supporting goal, project, or portfolio'),
			contribution_weight: z.number().min(0).max(1).optional().describe("Weight in the goal's progress, 0 to 1"),
			insert_before: z.string().optional().describe('Place it before this supporting resource GID'),
			insert_after: z.string().optional().describe('Place it after this supporting resource GID'),
			...readParams,
		},
		async ({ goal_gid, supporting_resource_gid, contribution_weight, insert_before, insert_after, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).addSupportingRelationship(
							goal_gid,
							supporting_resource_gid,
							{
								...(contribution_weight !== undefined && { contributionWeight: contribution_weight }),
								...(insert_before !== undefined && { insertBefore: insert_before }),
								...(insert_after !== undefined && { insertAfter: insert_after }),
							},
							readOptions(params),
						),
					),
				},
			],
		}),
	)

	server.tool(
		'asana_goal_supporting_remove',
		'Stop an Asana goal, project, or portfolio supporting a goal (paid plan)',
		{
			goal_gid: z.string().describe('Goal GID being supported'),
			supporting_resource_gid: z.string().describe('GID of the supporting goal, project, or portfolio'),
		},
		async ({ goal_gid, supporting_resource_gid }) => {
			await resolveGoalApi(api).removeSupportingRelationship(goal_gid, supporting_resource_gid)
			return {
				content: [
					{ type: 'text', text: `Removed supporting resource ${supporting_resource_gid} from goal ${goal_gid}` },
				],
			}
		},
	)

	server.tool(
		'asana_goal_follower_add',
		'Add followers to an Asana goal (paid plan)',
		{
			goal_gid: z.string().describe('Goal GID'),
			follower_gids: z.array(z.string()).describe('GIDs of users to add as followers'),
		},
		async ({ goal_gid, follower_gids }) => {
			await resolveGoalApi(api).addGoalFollowers(goal_gid, follower_gids)
			return { content: [{ type: 'text', text: `Added ${follower_gids.length} follower(s) to goal ${goal_gid}` }] }
		},
	)

	server.tool(
		'asana_goal_follower_remove',
		'Remove followers from an Asana goal (paid plan)',
		{
			goal_gid: z.string().describe('Goal GID'),
			follower_gids: z.array(z.string()).describe('GIDs of users to remove as followers'),
		},
		async ({ goal_gid, follower_gids }) => {
			await resolveGoalApi(api).removeGoalFollowers(goal_gid, follower_gids)
			return { content: [{ type: 'text', text: `Removed ${follower_gids.length} follower(s) from goal ${goal_gid}` }] }
		},
	)
}
