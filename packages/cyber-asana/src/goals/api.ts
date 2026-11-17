import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { CreateGoalFields, GoalGateway, GoalMetricInput, UpdateGoalFields } from './gateway.js'

export type { CreateGoalFields, GoalMetricInput, UpdateGoalFields } from './gateway.js'

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
		listTimePeriods(workspaceGid: string, opts?: PaginationOptions) {
			return gateway.listTimePeriods(workspaceGid, opts)
		},
		setGoalMetric(goalGid: string, metric: GoalMetricInput) {
			return gateway.setGoalMetric(goalGid, metric)
		},
		setGoalMetricCurrentValue(goalGid: string, currentNumberValue: number) {
			return gateway.setGoalMetricCurrentValue(goalGid, currentNumberValue)
		},
	}
}
