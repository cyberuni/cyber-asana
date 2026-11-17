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
}

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
}

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
}

export type GoalGateway = {
	listGoals(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<Asana.Goal>>
	getGoal(goalGid: string, opts?: ReadOptions): Promise<Asana.Goal>
	createGoal(workspaceGid: string, name: string, opts?: CreateGoalFields): Promise<Asana.Goal>
	updateGoal(goalGid: string, fields: UpdateGoalFields): Promise<Asana.Goal>
	deleteGoal(goalGid: string): Promise<void>
	listTimePeriods(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<Asana.TimePeriod>>
	setGoalMetric(goalGid: string, metric: GoalMetricInput): Promise<GoalMetric>
	setGoalMetricCurrentValue(goalGid: string, currentNumberValue: number): Promise<GoalMetric>
}

export function createAsanaGoalGateway(client: Asana.ApiClient): GoalGateway {
	const goalsApi = new Asana.GoalsApi(client)
	const timePeriodsApi = new Asana.TimePeriodsApi(client)

	return {
		async listGoals(workspaceGid, opts) {
			const res = await goalsApi.getGoals({ workspace: workspaceGid, ...toAsanaPaginationOptions(opts) })
			return await collectListResponse(res, opts)
		},
		async getGoal(goalGid, opts) {
			const res = await goalsApi.getGoal(goalGid, toAsanaReadOptions(opts))
			return res.data
		},
		async createGoal(workspaceGid, name, opts) {
			const res = await goalsApi.createGoal({ data: { name, workspace: workspaceGid, ...opts } })
			return res.data
		},
		async updateGoal(goalGid, fields) {
			const res = await goalsApi.updateGoal({ data: fields }, goalGid, {})
			return res.data
		},
		async deleteGoal(goalGid) {
			await goalsApi.deleteGoal(goalGid)
		},
		async listTimePeriods(workspaceGid, opts) {
			const res = await timePeriodsApi.getTimePeriods(workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async setGoalMetric(goalGid, metric) {
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
					},
				},
				goalGid,
				{},
			)
			return res.data
		},
		async setGoalMetricCurrentValue(goalGid, currentNumberValue) {
			const res = await goalsApi.updateGoalMetric({ data: { current_number_value: currentNumberValue } }, goalGid, {})
			return res.data
		},
	}
}
