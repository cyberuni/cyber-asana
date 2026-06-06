import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../pagination.js'
import type { StoryCreateFields } from './write-options.js'

export type TaskTemplateData = {
	name?: string
	assignee?: { name: string } | null
	due_on?: string | null
	notes?: string
}

export type StoryGateway = {
	listStories(taskGid: string, opts?: PaginationOptions): Promise<ListResult<any>>
	createStory(taskGid: string, fields: StoryCreateFields): Promise<any>
	getTaskTemplateData(taskGid: string): Promise<TaskTemplateData>
}

export function createAsanaStoryGateway(client: Asana.ApiClient): StoryGateway {
	const storiesApi = new Asana.StoriesApi(client)
	const tasksApi = new Asana.TasksApi(client)

	return {
		async listStories(taskGid, opts) {
			const res = await storiesApi.getStoriesForTask(taskGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async createStory(taskGid, fields) {
			const res = await storiesApi.createStoryForTask({ data: fields }, taskGid, {})
			return res.data
		},
		async getTaskTemplateData(taskGid) {
			const res = await tasksApi.getTask(taskGid, {})
			return res.data
		},
	}
}
