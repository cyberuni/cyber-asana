import { createClient } from '../client.js'
import { buildMcpToolErrorBody } from '../mcp-error.js'
import type { PaginationOptions } from '../pagination.js'
import type { ReadOptions } from '../read-options.js'
import { createAsanaStoryGateway, type StoryGateway, type TaskTemplateData } from './gateway.js'
import {
	buildStoryCreateFields,
	buildStoryUpdateFields,
	type StoryCreateFields,
	type StoryUpdateFields,
} from './write-options.js'

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

// Asana returns a bare 403 for both "not your comment" and "system stories are
// immutable", and the two are the only realistic ways an edit or a delete is
// refused. Naming them turns the refusal into something the caller can act on.
const STORY_PERMISSION_HINT =
	'Asana only allows editing or deleting comment stories you authored. System stories (assignee changed, due date set) are immutable.'

function annotateStoryPermissionError(error: unknown): never {
	if (buildMcpToolErrorBody(error).error.status === 403 && error && typeof error === 'object') {
		const annotated = error as { hint?: string }
		annotated.hint ??= STORY_PERMISSION_HINT
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
			// Local shape checks run outside the try: their messages mention html_text, and the
			// catch below would otherwise attribute a never-sent payload to Asana (#99).
			const payload = buildStoryCreateFields({
				text: fields.text,
				htmlText: fields.html_text,
				isPinned: fields.is_pinned,
				stickerName: fields.sticker_name,
			})
			try {
				return await gateway.createStory(taskGid, payload)
			} catch (error) {
				normalizeStoryCreateError(error)
			}
		},
		getStory(storyGid: string, opts?: ReadOptions) {
			return gateway.getStory(storyGid, opts)
		},
		async updateStory(storyGid: string, fields: StoryUpdateFields) {
			// Same reasoning as createStory: validate outside the try so a locally
			// rejected payload is never attributed to Asana.
			const payload = buildStoryUpdateFields({
				text: fields.text,
				htmlText: fields.html_text,
				isPinned: fields.is_pinned,
				stickerName: fields.sticker_name,
			})
			try {
				return await gateway.updateStory(storyGid, payload)
			} catch (error) {
				annotateStoryPermissionError(error)
			}
		},
		async deleteStory(storyGid: string) {
			try {
				return await gateway.deleteStory(storyGid)
			} catch (error) {
				annotateStoryPermissionError(error)
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
