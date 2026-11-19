import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** Fields Asana accepts on goal creation. */
export type CreateGoalFields = {
	notes?: string
	html_notes?: string
	due_on?: string
	start_on?: string
	/** Asana requires one on creation. */
	time_period?: string
	owner?: string
	/** Asana honours it only in an organization. */
	team?: string
	/** Organization only; a goal that is not workspace-level is a team goal. */
	is_workspace_level?: boolean
	liked?: boolean
	/** Users as "me", an email, or a GID; set on create only. */
	followers?: string[]
}

export const GOAL_STATUSES = ['green', 'yellow', 'red', 'missed', 'achieved', 'partial', 'dropped'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

/**
 * Fields Asana accepts on a goal update. The dates are nullable: sending `null`
 * is how Asana clears one, which is what `--clear-due-on` / `--clear-start-on`
 * and their MCP counterparts send.
 */
export type UpdateGoalFields = {
	name?: string
	notes?: string
	html_notes?: string
	due_on?: string | null
	start_on?: string | null
	time_period?: string
	owner?: string
	team?: string
	is_workspace_level?: boolean
	liked?: boolean
	/** Asana accepts it only when the goal has a metric. */
	status?: GoalStatus
	custom_fields?: Record<string, unknown>
	html_custom_fields?: Record<string, string>
}

/** Filters of `listGoals` besides the workspace; Asana needs a workspace, portfolio, project, task or team. */
export type GoalListFilters = {
	portfolio?: string
	project?: string
	task?: string
	team?: string
	/** Needs the workspace. */
	isWorkspaceLevel?: boolean
	timePeriods?: string[]
}

export type GoalListOptions = PaginationOptions & GoalListFilters

/** Filters of `listTimePeriods`: ISO dates (YYYY-MM-DD). */
export type TimePeriodListOptions = PaginationOptions & { startOn?: string; endOn?: string }

/** The metric object Asana returns, as far as cyber-asana reads it. */
export type GoalMetric = {
	gid?: string
	unit?: string
	current_number_value?: number
	target_number_value?: number
	[key: string]: unknown
}

/** Request body of `setMetric`, from developers.asana.com; unverified against a live paid workspace. */
export type GoalMetricInput = {
	unit?: 'none' | 'currency' | 'percentage'
	precision?: number
	currencyCode?: string
	initialNumberValue?: number
	targetNumberValue?: number
	currentNumberValue?: number
	progressSource?:
		| 'manual'
		| 'subgoal_progress'
		| 'project_task_completion'
		| 'project_milestone_completion'
		| 'task_completion'
		| 'external'
	/** Relevant only for a subgoal, project, milestone or task completion progress source. */
	isCustomWeight?: boolean
}

/** Options of `addSupportingRelationship`, from developers.asana.com; unverified against a live paid workspace. */
export type SupportingRelationshipOptions = {
	/** A supporting goal's weight in the parent's progress, 0 to 1. */
	contributionWeight?: number
	insertBefore?: string
	insertAfter?: string
}

export type GoalGateway = {
	listGoals(workspaceGid: string | undefined, opts?: GoalListOptions): Promise<ListResult<Asana.Goal>>
	getGoal(goalGid: string, opts?: ReadOptions): Promise<Asana.Goal>
	createGoal(workspaceGid: string, name: string, opts?: CreateGoalFields, read?: ReadOptions): Promise<Asana.Goal>
	updateGoal(goalGid: string, fields: UpdateGoalFields, opts?: ReadOptions): Promise<Asana.Goal>
	deleteGoal(goalGid: string): Promise<void>
	listTimePeriods(workspaceGid: string, opts?: TimePeriodListOptions): Promise<ListResult<Asana.TimePeriod>>
	getTimePeriod(timePeriodGid: string, opts?: ReadOptions): Promise<Asana.TimePeriod>
	setGoalMetric(goalGid: string, metric: GoalMetricInput, opts?: ReadOptions): Promise<GoalMetric>
	setGoalMetricCurrentValue(goalGid: string, currentNumberValue: number, opts?: ReadOptions): Promise<GoalMetric>
	addSupportingRelationship(
		goalGid: string,
		supportingResourceGid: string,
		opts?: SupportingRelationshipOptions,
		read?: ReadOptions,
	): Promise<{ gid?: string; [key: string]: unknown }>
	removeSupportingRelationship(goalGid: string, supportingResourceGid: string): Promise<void>
	addGoalFollowers(goalGid: string, followerGids: string[]): Promise<Asana.Goal>
	removeGoalFollowers(goalGid: string, followerGids: string[]): Promise<Asana.Goal>
}

export function createAsanaGoalGateway(client: Asana.ApiClient): GoalGateway {
	const goalsApi = new Asana.GoalsApi(client)
	const timePeriodsApi = new Asana.TimePeriodsApi(client)
	const relationshipsApi = new Asana.GoalRelationshipsApi(client)

	return {
		async listGoals(workspaceGid, opts) {
			const { portfolio, project, task, team, isWorkspaceLevel, timePeriods, ...rest } = opts ?? {}
			const pagination = opts && Object.keys(rest).length > 0 ? rest : undefined
			const res = await goalsApi.getGoals({
				...(workspaceGid !== undefined && { workspace: workspaceGid }),
				...(portfolio !== undefined && { portfolio }),
				...(project !== undefined && { project }),
				...(task !== undefined && { task }),
				...(team !== undefined && { team }),
				...(isWorkspaceLevel !== undefined && { is_workspace_level: isWorkspaceLevel }),
				// Asana reads a comma-separated list; the SDK's array type would be sent as repeated keys.
				...(timePeriods?.length && { time_periods: timePeriods.join(',') as never }),
				...toAsanaPaginationOptions(pagination),
			})
			return await collectListResponse(res, pagination)
		},
		async getGoal(goalGid, opts) {
			const res = await goalsApi.getGoal(goalGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createGoal(workspaceGid, name, opts, read) {
			const res = await goalsApi.createGoal(
				{ data: { name, workspace: workspaceGid, ...opts } },
				toAsanaReadOptions(read),
			)
			return res.data
		},
		async updateGoal(goalGid, fields, opts) {
			const res = await goalsApi.updateGoal({ data: fields }, goalGid, toAsanaReadOptions(opts))
			return res.data
		},
		async deleteGoal(goalGid) {
			await goalsApi.deleteGoal(goalGid)
		},
		async listTimePeriods(workspaceGid, opts) {
			const { startOn, endOn, ...rest } = opts ?? {}
			const pagination = opts && Object.keys(rest).length > 0 ? rest : undefined
			const res = await timePeriodsApi.getTimePeriods(workspaceGid, {
				...toAsanaPaginationOptions(pagination),
				...(startOn !== undefined && { start_on: startOn }),
				...(endOn !== undefined && { end_on: endOn }),
			})
			return await collectListResponse(res, pagination)
		},
		async getTimePeriod(timePeriodGid, opts) {
			const res = await timePeriodsApi.getTimePeriod(timePeriodGid, toAsanaReadOptions(opts))
			return res.data
		},
		async setGoalMetric(goalGid, metric, opts) {
			const res = await goalsApi.createGoalMetric(
				{
					data: {
						...(metric.unit !== undefined && { unit: metric.unit }),
						...(metric.precision !== undefined && { precision: metric.precision }),
						...(metric.currencyCode !== undefined && { currency_code: metric.currencyCode }),
						...(metric.initialNumberValue !== undefined && { initial_number_value: metric.initialNumberValue }),
						...(metric.targetNumberValue !== undefined && { target_number_value: metric.targetNumberValue }),
						...(metric.currentNumberValue !== undefined && { current_number_value: metric.currentNumberValue }),
						...(metric.progressSource !== undefined && { progress_source: metric.progressSource }),
						...(metric.isCustomWeight !== undefined && { is_custom_weight: metric.isCustomWeight }),
					},
				},
				goalGid,
				toAsanaReadOptions(opts),
			)
			return res.data
		},
		async setGoalMetricCurrentValue(goalGid, currentNumberValue, opts) {
			const res = await goalsApi.updateGoalMetric(
				{ data: { current_number_value: currentNumberValue } },
				goalGid,
				toAsanaReadOptions(opts),
			)
			return res.data
		},
		async addSupportingRelationship(goalGid, supportingResourceGid, opts, read) {
			const res = await relationshipsApi.addSupportingRelationship(
				{
					data: {
						supporting_resource: supportingResourceGid,
						...(opts?.contributionWeight !== undefined && { contribution_weight: opts.contributionWeight }),
						...(opts?.insertBefore !== undefined && { insert_before: opts.insertBefore }),
						...(opts?.insertAfter !== undefined && { insert_after: opts.insertAfter }),
					},
				},
				goalGid,
				toAsanaReadOptions(read),
			)
			return res.data
		},
		async removeSupportingRelationship(goalGid, supportingResourceGid) {
			await relationshipsApi.removeSupportingRelationship(
				{ data: { supporting_resource: supportingResourceGid } },
				goalGid,
			)
		},
		async addGoalFollowers(goalGid, followerGids) {
			const res = await goalsApi.addFollowers({ data: { followers: followerGids } }, goalGid, {})
			return res.data
		},
		async removeGoalFollowers(goalGid, followerGids) {
			const res = await goalsApi.removeFollowers({ data: { followers: followerGids } }, goalGid, {})
			return res.data
		},
	}
}
