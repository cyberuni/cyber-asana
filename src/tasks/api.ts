import Asana from 'asana'
import { createClient } from '../client.js'

export async function listTasks(projectGid: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTasksForProject(projectGid, {})
	return res.data
}

export async function getTask(taskGid: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTask(taskGid, {})
	return res.data
}

export async function createTask(
	workspaceGid: string,
	name: string,
	opts?: { notes?: string; assignee?: string; projects?: string[]; due_on?: string },
) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.createTask({
		data: {
			name,
			workspace: workspaceGid,
			...opts,
			projects: opts?.projects?.map((gid) => ({ gid })),
		},
	})
	return res.data
}

export async function updateTask(
	taskGid: string,
	fields: { name?: string; notes?: string; completed?: boolean; due_on?: string; assignee?: string },
) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.updateTask({ data: fields }, taskGid, {})
	return res.data
}

export async function deleteTask(taskGid: string) {
	const api = new Asana.TasksApi(createClient())
	await api.deleteTask(taskGid)
}

export async function searchTasks(workspaceGid: string, text: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.searchTasksForWorkspace(workspaceGid, { text })
	return res.data
}
