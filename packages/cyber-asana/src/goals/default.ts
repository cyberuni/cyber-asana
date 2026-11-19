import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createGoalApi } from './api.js'
import {
	type CreateGoalFields,
	createAsanaGoalGateway,
	type GoalListOptions,
	type GoalMetricInput,
	type SupportingRelationshipOptions,
	type TimePeriodListOptions,
	type UpdateGoalFields,
} from './gateway.js'

function defaultGoalApi() {
	return createGoalApi(createAsanaGoalGateway(createClient()))
}

export async function listGoals(workspaceGid: string | undefined, opts?: GoalListOptions) {
	return defaultGoalApi().listGoals(workspaceGid, opts)
}

export async function getGoal(goalGid: string, opts?: ReadOptions) {
	return defaultGoalApi().getGoal(goalGid, opts)
}

export async function createGoal(workspaceGid: string, name: string, opts?: CreateGoalFields, read?: ReadOptions) {
	return defaultGoalApi().createGoal(workspaceGid, name, opts, read)
}

export async function updateGoal(goalGid: string, fields: UpdateGoalFields, opts?: ReadOptions) {
	return defaultGoalApi().updateGoal(goalGid, fields, opts)
}

export async function deleteGoal(goalGid: string) {
	return defaultGoalApi().deleteGoal(goalGid)
}

export async function listTimePeriods(workspaceGid: string, opts?: TimePeriodListOptions) {
	return defaultGoalApi().listTimePeriods(workspaceGid, opts)
}

export async function getTimePeriod(timePeriodGid: string, opts?: ReadOptions) {
	return defaultGoalApi().getTimePeriod(timePeriodGid, opts)
}

export async function setGoalMetric(goalGid: string, metric: GoalMetricInput, opts?: ReadOptions) {
	return defaultGoalApi().setGoalMetric(goalGid, metric, opts)
}

export async function setGoalMetricCurrentValue(goalGid: string, currentNumberValue: number, opts?: ReadOptions) {
	return defaultGoalApi().setGoalMetricCurrentValue(goalGid, currentNumberValue, opts)
}

export async function addSupportingRelationship(
	goalGid: string,
	supportingResourceGid: string,
	opts?: SupportingRelationshipOptions,
	read?: ReadOptions,
) {
	return defaultGoalApi().addSupportingRelationship(goalGid, supportingResourceGid, opts, read)
}

export async function removeSupportingRelationship(goalGid: string, supportingResourceGid: string) {
	return defaultGoalApi().removeSupportingRelationship(goalGid, supportingResourceGid)
}

export async function addGoalFollowers(goalGid: string, followerGids: string[]) {
	return defaultGoalApi().addGoalFollowers(goalGid, followerGids)
}

export async function removeGoalFollowers(goalGid: string, followerGids: string[]) {
	return defaultGoalApi().removeGoalFollowers(goalGid, followerGids)
}
