import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'
import type { GoalStoryCreateFields, StoryCreateFields, StoryListFilters, StoryUpdateFields } from './write-options.js'

export type TaskTemplateData = {
	name?: string
	assignee?: { name?: string } | null
	due_on?: string | null
	notes?: string
}

/** Pagination plus the story list filters. */
export type StoryListOptions = PaginationOptions & StoryListFilters

/** The filters under Asana's names; unset ones are left out so the SDK sends only what the caller chose. */
function toAsanaStoryListParams(opts?: StoryListOptions) {
	return {
		...toAsanaPaginationOptions(opts),
		...(opts?.createdAfter !== undefined && { created_after: opts.createdAfter }),
		...(opts?.commentsOnly && { resource_subtype: 'comment_added' }),
		...(opts?.sortAscending !== undefined && { sort_ascending: opts.sortAscending }),
	}
}

export type StoryGateway = {
	listStories(taskGid: string, opts?: StoryListOptions): Promise<ListResult<Asana.Story>>
	createStory(taskGid: string, fields: StoryCreateFields, opts?: ReadOptions): Promise<Asana.Story>
	getStory(storyGid: string, opts?: ReadOptions): Promise<Asana.Story>
	updateStory(storyGid: string, fields: StoryUpdateFields, opts?: ReadOptions): Promise<Asana.Story>
	deleteStory(storyGid: string): Promise<void>
	getTaskTemplateData(taskGid: string): Promise<TaskTemplateData>
	/** Goal stories are a paid feature; request shapes from developers.asana.com, unverified live. */
	listGoalStories(goalGid: string, opts?: StoryListOptions): Promise<ListResult<Asana.Story>>
	createGoalStory(goalGid: string, fields: GoalStoryCreateFields, opts?: ReadOptions): Promise<Asana.Story>
}

export function createAsanaStoryGateway(client: Asana.ApiClient): StoryGateway {
	const storiesApi = new Asana.StoriesApi(client)
	const tasksApi = new Asana.TasksApi(client)

	return {
		async listStories(taskGid, opts) {
			const res = await storiesApi.getStoriesForTask(taskGid, toAsanaStoryListParams(opts))
			return await collectListResponse(res, opts)
		},
		async createStory(taskGid, fields, opts) {
			const res = await storiesApi.createStoryForTask({ data: fields }, taskGid, toAsanaReadOptions(opts))
			return res.data
		},
		async getStory(storyGid, opts) {
			const res = await storiesApi.getStory(storyGid, toAsanaReadOptions(opts))
			return res.data
		},
		async updateStory(storyGid, fields, opts) {
			const res = await storiesApi.updateStory({ data: fields }, storyGid, toAsanaReadOptions(opts))
			return res.data
		},
		async deleteStory(storyGid) {
			await storiesApi.deleteStory(storyGid)
		},
		async getTaskTemplateData(taskGid) {
			const res = await tasksApi.getTask(taskGid, {})
			return res.data
		},
		async listGoalStories(goalGid, opts) {
			const res = await storiesApi.getStoriesForGoal(goalGid, toAsanaStoryListParams(opts))
			return await collectListResponse(res, opts)
		},
		async createGoalStory(goalGid, fields, opts) {
			const res = await storiesApi.createStoryForGoal({ data: fields }, goalGid, toAsanaReadOptions(opts))
			return res.data
		},
	}
}
