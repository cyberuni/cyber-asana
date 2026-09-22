import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import type { ReadOptions } from '../read-options.js'
import { type CreateGoalFields, createAsanaGoalGateway, type GoalGateway, type UpdateGoalFields } from './gateway.js'

export type { CreateGoalFields, UpdateGoalFields } from './gateway.js'

export type GoalApi = ReturnType<typeof createGoalApi>

export function createGoalApi(gateway: GoalGateway) {
	return {
		listGoals(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listGoals(workspaceGid, opts)
		},
		getGoal(goalGid: string, opts?: ReadOptions) {
			return gateway.getGoal(goalGid, opts)
		},
		createGoal(workspaceGid: string, name: string, opts?: CreateGoalFields) {
			return gateway.createGoal(workspaceGid, name, opts)
		},
		updateGoal(goalGid: string, fields: UpdateGoalFields) {
			return gateway.updateGoal(goalGid, fields)
		},
		deleteGoal(goalGid: string) {
			return gateway.deleteGoal(goalGid)
		},
	}
}

function defaultGoalApi() {
	return createGoalApi(createAsanaGoalGateway(createClient()))
}

export async function listGoals(workspaceGid: string, opts?: PaginationOptions) {
	return defaultGoalApi().listGoals(workspaceGid, opts)
}

export async function getGoal(goalGid: string, opts?: ReadOptions) {
	return defaultGoalApi().getGoal(goalGid, opts)
}

export async function createGoal(workspaceGid: string, name: string, opts?: CreateGoalFields) {
	return defaultGoalApi().createGoal(workspaceGid, name, opts)
}

export async function updateGoal(goalGid: string, fields: UpdateGoalFields) {
	return defaultGoalApi().updateGoal(goalGid, fields)
}

export async function deleteGoal(goalGid: string) {
	return defaultGoalApi().deleteGoal(goalGid)
}
