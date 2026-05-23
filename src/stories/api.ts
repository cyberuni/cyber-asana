import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'

type TaskForTemplate = {
	name?: string
	assignee?: { name: string } | null
	due_on?: string | null
	notes?: string
}

export function interpolateTemplate(text: string, task: TaskForTemplate): string {
	return text
		.replace(/\{task\.name\}/g, task.name ?? '')
		.replace(/\{task\.assignee\}/g, task.assignee?.name ?? '')
		.replace(/\{task\.due_on\}/g, task.due_on ?? '')
		.replace(/\{task\.notes\}/g, task.notes ?? '')
}

export async function listStories(taskGid: string, opts?: PaginationOptions) {
	const api = new Asana.StoriesApi(createClient())
	const res = await api.getStoriesForTask(taskGid, toAsanaPaginationOptions(opts))
	return await collectListResponse(res, opts)
}

export async function createStory(taskGid: string, text: string) {
	const api = new Asana.StoriesApi(createClient())
	const res = await api.createStoryForTask({ data: { text } }, taskGid, {})
	return res.data
}
