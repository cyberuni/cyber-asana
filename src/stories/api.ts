import Asana from 'asana'
import { createClient } from '../client.js'
import { collectListResponse, type PaginationOptions, toAsanaPaginationOptions } from '../pagination.js'
import { buildStoryCreateFields, type StoryCreateFields } from './write-options.js'

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

function normalizeStoryCreateError(error: unknown) {
	const message = error instanceof Error ? error.message : String(error)
	if (message.includes('html_text')) {
		throw new Error(
			`Asana rejected html_text: ${message}. Ensure the payload is valid Asana rich text wrapped in a single <body>...</body> element with balanced tags.`,
		)
	}
	throw error
}

export async function createStory(taskGid: string, fields: StoryCreateFields) {
	const api = new Asana.StoriesApi(createClient())
	try {
		const res = await api.createStoryForTask(
			{ data: buildStoryCreateFields({ text: fields.text, htmlText: fields.html_text }) },
			taskGid,
			{},
		)
		return res.data
	} catch (error) {
		normalizeStoryCreateError(error)
	}
}
