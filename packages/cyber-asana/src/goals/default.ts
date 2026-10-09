import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createGoalApi } from './api.js'
import { type CreateGoalFields, createAsanaGoalGateway, type UpdateGoalFields } from './gateway.js'

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
