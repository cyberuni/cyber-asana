import Asana from 'asana'
import { createClient } from '../client.js'
import { type PaginationOptions, toAsanaPaginationOptions, unwrapListResponse } from '../pagination.js'

export async function listStories(taskGid: string, opts?: PaginationOptions) {
	const api = new Asana.StoriesApi(createClient())
	const res = await api.getStoriesForTask(taskGid, toAsanaPaginationOptions(opts))
	return unwrapListResponse(res, opts)
}

export async function createStory(taskGid: string, text: string) {
	const api = new Asana.StoriesApi(createClient())
	const res = await api.createStoryForTask({ data: { text } }, taskGid, {})
	return res.data
}
