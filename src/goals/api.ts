import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaGoalGateway, type GoalGateway } from './gateway.js'

export type GoalApi = ReturnType<typeof createGoalApi>

export function createGoalApi(gateway: GoalGateway) {
	return {
		listGoals(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listGoals(workspaceGid, opts)
		},
		getGoal(goalGid: string) {
			return gateway.getGoal(goalGid)
		},
		createGoal(workspaceGid: string, name: string, opts?: { notes?: string; due_on?: string }) {
			return gateway.createGoal(workspaceGid, name, opts)
		},
		updateGoal(goalGid: string, fields: { name?: string; notes?: string; due_on?: string }) {
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

export async function getGoal(goalGid: string) {
	return defaultGoalApi().getGoal(goalGid)
}

export async function createGoal(workspaceGid: string, name: string, opts?: { notes?: string; due_on?: string }) {
	return defaultGoalApi().createGoal(workspaceGid, name, opts)
}

export async function updateGoal(goalGid: string, fields: { name?: string; notes?: string; due_on?: string }) {
	return defaultGoalApi().updateGoal(goalGid, fields)
}

export async function deleteGoal(goalGid: string) {
	return defaultGoalApi().deleteGoal(goalGid)
}
