import Asana from 'asana'
import { createClient } from '../client.js'

export async function listProjects(workspaceGid: string) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.getProjectsForWorkspace(workspaceGid, {})
	return res.data
}

export async function getProject(projectGid: string) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.getProject(projectGid, {})
	return res.data
}

export async function createProject(workspaceGid: string, name: string, opts?: { notes?: string; color?: string }) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.createProject({
		data: { name, workspace: workspaceGid, ...opts },
	})
	return res.data
}

export async function updateProject(projectGid: string, fields: { name?: string; notes?: string; color?: string }) {
	const api = new Asana.ProjectsApi(createClient())
	const res = await api.updateProject({ data: fields }, projectGid, {})
	return res.data
}

export async function deleteProject(projectGid: string) {
	const api = new Asana.ProjectsApi(createClient())
	await api.deleteProject(projectGid)
}
