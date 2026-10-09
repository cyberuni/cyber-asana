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

export async function createStory(taskGid: string, fields: StoryCreateFields) {
	return defaultStoryApi().createStory(taskGid, fields)
}

export async function getStory(storyGid: string, opts?: ReadOptions) {
	return defaultStoryApi().getStory(storyGid, opts)
}

export async function updateStory(storyGid: string, fields: StoryUpdateFields) {
	return defaultStoryApi().updateStory(storyGid, fields)
}

export async function deleteStory(storyGid: string) {
	return defaultStoryApi().deleteStory(storyGid)
}

export async function getTaskTemplateData(taskGid: string) {
	return defaultStoryApi().getTaskTemplateData(taskGid)
}
