import Asana from 'asana'
import { createClient } from '../client.js'

export async function listStories(taskGid: string) {
	const api = new Asana.StoriesApi(createClient())
	const res = await api.getStoriesForTask(taskGid, {})
	return res.data
}

export async function createStory(taskGid: string, text: string) {
	const api = new Asana.StoriesApi(createClient())
	const res = await api.createStoryForTask({ data: { text } }, taskGid, {})
	return res.data
}
