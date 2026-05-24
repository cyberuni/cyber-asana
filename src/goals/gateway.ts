import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'

export type GoalGateway = {
	listGoals(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getGoal(goalGid: string): Promise<any>
	createGoal(workspaceGid: string, name: string, opts?: { notes?: string; due_on?: string }): Promise<any>
	updateGoal(goalGid: string, fields: { name?: string; notes?: string; due_on?: string }): Promise<any>
	deleteGoal(goalGid: string): Promise<void>
}

export function createAsanaGoalGateway(client: Asana.ApiClient): GoalGateway {
	const goalsApi = new Asana.GoalsApi(client)

	return {
		async listGoals(workspaceGid, opts) {
			const res = await goalsApi.getGoals({ workspace: workspaceGid, ...toAsanaPaginationOptions(opts) })
			return await collectListResponse(res, opts)
		},
		async getGoal(goalGid) {
			const res = await goalsApi.getGoal(goalGid, {})
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
