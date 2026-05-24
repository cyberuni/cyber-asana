import { createClient } from '../client.js'
import type { PaginationOptions } from '../pagination.js'
import { createAsanaStoryGateway, type StoryGateway, type TaskTemplateData } from './gateway.js'
import { buildStoryCreateFields, type StoryCreateFields } from './write-options.js'

export function interpolateTemplate(text: string, task: TaskTemplateData): string {
	return text
		.replace(/\{task\.name\}/g, task.name ?? '')
		.replace(/\{task\.assignee\}/g, task.assignee?.name ?? '')
		.replace(/\{task\.due_on\}/g, task.due_on ?? '')
		.replace(/\{task\.notes\}/g, task.notes ?? '')
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

export type StoryApi = ReturnType<typeof createStoryApi>

export function createStoryApi(gateway: StoryGateway) {
	return {
		listStories(taskGid: string, opts?: PaginationOptions) {
			return gateway.listStories(taskGid, opts)
		},
		async createStory(taskGid: string, fields: StoryCreateFields) {
			try {
				return await gateway.createStory(
					taskGid,
					buildStoryCreateFields({ text: fields.text, htmlText: fields.html_text }),
				)
			} catch (error) {
				normalizeStoryCreateError(error)
			}
		},
		getTaskTemplateData(taskGid: string) {
			return gateway.getTaskTemplateData(taskGid)
		},
	}
}

function defaultStoryApi() {
	return createStoryApi(createAsanaStoryGateway(createClient()))
}

export async function listStories(taskGid: string, opts?: PaginationOptions) {
	return defaultStoryApi().listStories(taskGid, opts)
}

export async function createStory(taskGid: string, fields: StoryCreateFields) {
	return defaultStoryApi().createStory(taskGid, fields)
}

export async function getTaskTemplateData(taskGid: string) {
	return defaultStoryApi().getTaskTemplateData(taskGid)
}
