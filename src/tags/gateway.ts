import Asana from 'asana'
import { collectListResponse, type ListResult, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

export type TagWriteFields = {
	name?: string
	color?: string
	notes?: string
}

export type TagGateway = {
	listTags(workspaceGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	getTag(tagGid: string): Promise<any>
	createTag(workspaceGid: string, name: string, fields?: Omit<TagWriteFields, 'name'>): Promise<any>
	updateTag(tagGid: string, fields: TagWriteFields): Promise<any>
	deleteTag(tagGid: string): Promise<void>
	listTagsForTask(taskGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	listTasksForTag(tagGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	addTagToTask(taskGid: string, tagGid: string): Promise<any>
	removeTagFromTask(taskGid: string, tagGid: string): Promise<any>
}

export function createAsanaTagGateway(client: Asana.ApiClient): TagGateway {
	const tagsApi = new Asana.TagsApi(client)
	const tasksApi = new Asana.TasksApi(client)

	return {
		async listTags(workspaceGid, opts) {
			const res = await tagsApi.getTagsForWorkspace(workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async getTag(tagGid) {
			const res = await tagsApi.getTag(tagGid, {})
			return res.data
		},
		async createTag(workspaceGid, name, fields) {
			const res = await tagsApi.createTagForWorkspace({ data: { name, ...fields } }, workspaceGid)
			return res.data
		},
		async updateTag(tagGid, fields) {
			const res = await tagsApi.updateTag({ data: fields }, tagGid, {})
			return res.data
		},
		async deleteTag(tagGid) {
			await tagsApi.deleteTag(tagGid)
		},
		async listTagsForTask(taskGid, opts) {
			const res = await tagsApi.getTagsForTask(taskGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async listTasksForTag(tagGid, opts) {
			const res = await tasksApi.getTasksForTag(tagGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async addTagToTask(taskGid, tagGid) {
			const res = await tasksApi.addTagForTask({ data: { tag: tagGid } }, taskGid)
			return res.data
		},
		async removeTagFromTask(taskGid, tagGid) {
			const res = await tasksApi.removeTagForTask({ data: { tag: tagGid } }, taskGid)
			return res.data
		},
	}
}
