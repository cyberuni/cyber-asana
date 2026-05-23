import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export async function listGoals(workspaceGid: string, opts?: PaginationOptions) {
	const api = new Asana.GoalsApi(createClient())
	const res = await api.getGoals({ workspace: workspaceGid, ...toAsanaPaginationOptions(opts) })
	return await collectListResponse(res, opts)
}

export async function getGoal(goalGid: string) {
	const api = new Asana.GoalsApi(createClient())
	const res = await api.getGoal(goalGid, {})
	return res.data
}

export async function createGoal(workspaceGid: string, name: string, opts?: { notes?: string; due_on?: string }) {
	const api = new Asana.GoalsApi(createClient())
	const res = await api.createGoal({ data: { name, workspace: workspaceGid, ...opts } })
	return res.data
}

export async function updateGoal(goalGid: string, fields: { name?: string; notes?: string; due_on?: string }) {
	const api = new Asana.GoalsApi(createClient())
	const res = await api.updateGoal({ data: fields }, goalGid, {})
	return res.data
}

export async function deleteGoal(goalGid: string) {
	const api = new Asana.GoalsApi(createClient())
	await api.deleteGoal(goalGid)
}
