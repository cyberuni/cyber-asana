import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../read-options.js'

/** Fields Asana accepts on goal creation. */
export type CreateGoalFields = {
	notes?: string
	html_notes?: string
	due_on?: string
	start_on?: string
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

export type GoalGateway = {
	listGoals(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getGoal(goalGid: string, opts?: ReadOptions): Promise<any>
	createGoal(workspaceGid: string, name: string, opts?: CreateGoalFields): Promise<any>
	updateGoal(goalGid: string, fields: UpdateGoalFields): Promise<any>
	deleteGoal(goalGid: string): Promise<void>
}

export function createAsanaGoalGateway(client: Asana.ApiClient): GoalGateway {
	const goalsApi = new Asana.GoalsApi(client)

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
	}
}
