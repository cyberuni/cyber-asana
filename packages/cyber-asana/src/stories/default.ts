import { createClient } from '../platform/client.js'
import type { PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createStoryApi } from './api.js'
import { createAsanaStoryGateway } from './gateway.js'
import type { StoryCreateFields, StoryUpdateFields } from './write-options.js'

function defaultStoryApi() {
	return createStoryApi(createAsanaStoryGateway(createClient()))
}

export async function listStories(taskGid: string, opts?: PaginationOptions) {
	return defaultStoryApi().listStories(taskGid, opts)
}

export async function createStory(taskGid: string, fields: StoryCreateFields, opts?: ReadOptions) {
	return defaultStoryApi().createStory(taskGid, fields, opts)
}

export async function getStory(storyGid: string, opts?: ReadOptions) {
	return defaultStoryApi().getStory(storyGid, opts)
}

export async function updateStory(storyGid: string, fields: StoryUpdateFields, opts?: ReadOptions) {
	return defaultStoryApi().updateStory(storyGid, fields, opts)
}

export async function deleteStory(storyGid: string) {
	return defaultStoryApi().deleteStory(storyGid)
}

export async function getTaskTemplateData(taskGid: string) {
	return defaultStoryApi().getTaskTemplateData(taskGid)
}

export async function listGoalStories(goalGid: string, opts?: PaginationOptions) {
	return defaultStoryApi().listGoalStories(goalGid, opts)
}

export async function createGoalStory(goalGid: string, fields: StoryCreateFields, opts?: ReadOptions) {
	return defaultStoryApi().createGoalStory(goalGid, fields, opts)
}
