import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createProjectBriefApi } from './api.js'
import { createAsanaProjectBriefGateway, type ProjectBriefFields } from './gateway.js'

function defaultProjectBriefApi() {
	return createProjectBriefApi(createAsanaProjectBriefGateway(createClient()))
}

export async function getProjectBrief(projectBriefGid: string, opts?: ReadOptions) {
	return defaultProjectBriefApi().getProjectBrief(projectBriefGid, opts)
}

export async function createProjectBrief(projectGid: string, fields: ProjectBriefFields) {
	return defaultProjectBriefApi().createProjectBrief(projectGid, fields)
}

export async function updateProjectBrief(projectBriefGid: string, fields: ProjectBriefFields) {
	return defaultProjectBriefApi().updateProjectBrief(projectBriefGid, fields)
}

export async function deleteProjectBrief(projectBriefGid: string) {
	return defaultProjectBriefApi().deleteProjectBrief(projectBriefGid)
}
