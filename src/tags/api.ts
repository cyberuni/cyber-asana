import Asana from 'asana'
import { createClient } from '../client.js'
import { type PaginationOptions, toAsanaPaginationOptions, unwrapListResponse } from '../pagination.js'

export async function listTags(workspaceGid: string, opts?: PaginationOptions) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.getTagsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
	return unwrapListResponse(res, opts)
}

export async function getTag(tagGid: string) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.getTag(tagGid, {})
	return res.data
}

export async function createTag(workspaceGid: string, name: string) {
	const api = new Asana.TagsApi(createClient())
	const res = await api.createTagForWorkspace({ data: { name } }, workspaceGid)
	return res.data
}
