import type { ReadOptions } from '../platform/read-options.js'
import type {
	CreateGoalFields,
	GoalGateway,
	GoalListOptions,
	GoalMetricInput,
	SupportingRelationshipOptions,
	TimePeriodListOptions,
	UpdateGoalFields,
} from './gateway.js'

export type {
	CreateGoalFields,
	GoalListOptions,
	GoalMetricInput,
	SupportingRelationshipOptions,
	TimePeriodListOptions,
	UpdateGoalFields,
} from './gateway.js'

function assertIsoDate(label: string, value?: string) {
	if (value === undefined) return
	const valid = /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
	if (!valid) throw new Error(`${label} must be a date (YYYY-MM-DD); got "${value}"`)
}

function assertGoalListScope(workspaceGid: string | undefined, opts?: GoalListOptions) {
	if (opts?.isWorkspaceLevel !== undefined && !workspaceGid) {
		throw new Error('is_workspace_level needs a workspace; pass the workspace GID with it')
	}
	if (!workspaceGid && !opts?.portfolio && !opts?.project && !opts?.task && !opts?.team) {
		throw new Error('list goals by a workspace, portfolio, project, task or team')
	}
}

export type GoalApi = ReturnType<typeof createGoalApi>

export function createGoalApi(gateway: GoalGateway) {
	return {
		listGoals(workspaceGid: string | undefined, opts?: GoalListOptions) {
			assertGoalListScope(workspaceGid, opts)
			return gateway.listGoals(workspaceGid, opts)
		},
		getGoal(goalGid: string, opts?: ReadOptions) {
			return gateway.getGoal(goalGid, opts)
		},
		createGoal(workspaceGid: string, name: string, opts?: CreateGoalFields, read?: ReadOptions) {
			return gateway.createGoal(workspaceGid, name, opts, read)
		},
		updateGoal(goalGid: string, fields: UpdateGoalFields, opts?: ReadOptions) {
			return gateway.updateGoal(goalGid, fields, opts)
		},
		deleteGoal(goalGid: string) {
			return gateway.deleteGoal(goalGid)
		},
		listTimePeriods(workspaceGid: string, opts?: TimePeriodListOptions) {
			assertIsoDate('start_on', opts?.startOn)
			assertIsoDate('end_on', opts?.endOn)
			return gateway.listTimePeriods(workspaceGid, opts)
		},
		getTimePeriod(timePeriodGid: string, opts?: ReadOptions) {
			return gateway.getTimePeriod(timePeriodGid, opts)
		},
		setGoalMetric(goalGid: string, metric: GoalMetricInput, opts?: ReadOptions) {
			return gateway.setGoalMetric(goalGid, metric, opts)
		},
		setGoalMetricCurrentValue(goalGid: string, currentNumberValue: number, opts?: ReadOptions) {
			return gateway.setGoalMetricCurrentValue(goalGid, currentNumberValue, opts)
		},
		addSupportingRelationship(
			goalGid: string,
			supportingResourceGid: string,
			opts?: SupportingRelationshipOptions,
			read?: ReadOptions,
		) {
			return gateway.addSupportingRelationship(goalGid, supportingResourceGid, opts, read)
		},
		removeSupportingRelationship(goalGid: string, supportingResourceGid: string) {
			return gateway.removeSupportingRelationship(goalGid, supportingResourceGid)
		},
		addGoalFollowers(goalGid: string, followerGids: string[]) {
			return gateway.addGoalFollowers(goalGid, followerGids)
		},
		removeGoalFollowers(goalGid: string, followerGids: string[]) {
			return gateway.removeGoalFollowers(goalGid, followerGids)
		},
	}
}
