import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { GoalApi, GoalMetricInput } from './api.js'
import {
	addSupportingRelationship,
	createGoal,
	deleteGoal,
	getGoal,
	listGoals,
	listTimePeriods,
	removeSupportingRelationship,
	setGoalMetric,
	setGoalMetricCurrentValue,
	updateGoal,
} from './default.js'
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
			setGoalMetric,
			setGoalMetricCurrentValue,
			addSupportingRelationship,
			removeSupportingRelationship,
		}
	)
}

export function registerGoalTools(server: McpServer, api?: GoalApi | (() => GoalApi)) {
	server.tool(
		'asana_goal_list',
		'List Asana goals in a workspace',
		{ workspace_gid: z.string().describe('Workspace GID'), ...paginationParams },
		async ({ workspace_gid, ...params }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveGoalApi(api).listGoals(workspace_gid, paginationOptions(params))),
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
		},
		async ({ workspace_gid, name, notes, html_notes, due_on, start_on }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).createGoal(
							workspace_gid,
							name,
							buildGoalCreateFields({ notes, htmlNotes: html_notes, dueOn: due_on, startOn: start_on }),
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
		},
		async ({ goal_gid, name, notes, html_notes, due_on, clear_due_on, start_on, clear_start_on }) => ({
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
							}),
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
		}) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).setGoalMetric(goal_gid, {
							...(unit !== undefined && { unit }),
							...(precision !== undefined && { precision }),
							...(currency_code !== undefined && { currencyCode: currency_code }),
							...(initial_number_value !== undefined && { initialNumberValue: initial_number_value }),
							...(target_number_value !== undefined && { targetNumberValue: target_number_value }),
							...(current_number_value !== undefined && { currentNumberValue: current_number_value }),
							...(progress_source !== undefined && {
								progressSource: progress_source as GoalMetricInput['progressSource'],
							}),
						}),
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
		},
		async ({ goal_gid, current_number_value }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveGoalApi(api).setGoalMetricCurrentValue(goal_gid, current_number_value)),
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
		},
		async ({ goal_gid, supporting_resource_gid, contribution_weight, insert_before, insert_after }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						await resolveGoalApi(api).addSupportingRelationship(goal_gid, supporting_resource_gid, {
							...(contribution_weight !== undefined && { contributionWeight: contribution_weight }),
							...(insert_before !== undefined && { insertBefore: insert_before }),
							...(insert_after !== undefined && { insertAfter: insert_after }),
						}),
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
}
