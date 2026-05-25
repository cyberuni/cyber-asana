import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams } from '../mcp-options.js'
import type { GoalApi } from './api.js'
import { createGoal, deleteGoal, getGoal, listGoals, updateGoal } from './api.js'

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
		{ goal_gid: z.string().describe('Goal GID') },
		async ({ goal_gid }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveGoalApi(api).getGoal(goal_gid)) }],
		}),
	)

	server.tool(
		'asana_goal_create',
		'Create an Asana goal',
		{
			workspace_gid: z.string().describe('Workspace GID'),
			name: z.string().describe('Goal name'),
			notes: z.string().optional().describe('Goal notes'),
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
		},
		async ({ workspace_gid, name, notes, due_on }) => ({
			content: [
				{
					type: 'text',
					text: JSON.stringify(await resolveGoalApi(api).createGoal(workspace_gid, name, { notes, due_on })),
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
			due_on: z.string().optional().describe('Due date (YYYY-MM-DD)'),
		},
		async ({ goal_gid, ...fields }) => ({
			content: [{ type: 'text', text: JSON.stringify(await resolveGoalApi(api).updateGoal(goal_gid, fields)) }],
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
