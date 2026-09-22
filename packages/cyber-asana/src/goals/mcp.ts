import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../mcp-options.js'
import type { GoalApi } from './api.js'
import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from './api.js'
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
}
