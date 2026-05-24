import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export type TagWriteFields = {
	name?: string
	color?: string
	notes?: string
}

export async function listTags(workspaceGid: string, opts?: PaginationOptions) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.getTagsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
	return await collectListResponse(res, opts)
}

export async function getTag(tagGid: string) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.getTag(tagGid, {})
	return res.data
}

export async function createTag(workspaceGid: string, name: string, fields?: Omit<TagWriteFields, 'name'>) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.createTagForWorkspace({ data: { name, ...fields } }, workspaceGid)
	return res.data
}

export async function updateTag(tagGid: string, fields: TagWriteFields) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.updateTag({ data: fields }, tagGid, {})
	return res.data
}

export async function deleteTag(tagGid: string) {
	const api = new Asana.TagsApi(createClient())
	await api.deleteTag(tagGid)
}

export async function listTagsForTask(taskGid: string, opts?: PaginationOptions) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.getTagsForTask(taskGid, toAsanaPaginationOptions(opts))
	return await collectListResponse(res, opts)
}

export async function listTasksForTag(tagGid: string, opts?: PaginationOptions) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.getTasksForTag(tagGid, toAsanaPaginationOptions(opts))
	return await collectListResponse(res, opts)
}

export async function addTagToTask(taskGid: string, tagGid: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.addTagForTask({ data: { tag: tagGid } }, taskGid)
	return res.data
}

export async function removeTagFromTask(taskGid: string, tagGid: string) {
	const api = new Asana.TasksApi(createClient())
	const res = await api.removeTagForTask({ data: { tag: tagGid } }, taskGid)
	return res.data
}
