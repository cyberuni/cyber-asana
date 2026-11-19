import { buildErrorBody } from '../platform/error-body.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { StoryGateway, StoryListOptions, TaskTemplateData } from './gateway.js'
import {
	buildStoryCreateFields,
	buildStoryUpdateFields,
	type GoalStoryCreateFields,
	type StoryCreateFields,
	type StoryUpdateFields,
	validateCreatedAfter,
} from './write-options.js'

export function interpolateTemplate(text: string, task: TaskTemplateData): string {
	return text
		.replace(/\{task\.name\}/g, task.name ?? '')
		.replace(/\{task\.assignee\}/g, task.assignee?.name ?? '')
		.replace(/\{task\.due_on\}/g, task.due_on ?? '')
		.replace(/\{task\.notes\}/g, task.notes ?? '')
}

function normalizeStoryCreateError(error: unknown): never {
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
	if (buildErrorBody(error).error.status === 403 && error && typeof error === 'object') {
		const annotated = error as { hint?: string }
		annotated.hint ??= STORY_PERMISSION_HINT
	}
	throw error
}

export type StoryApi = ReturnType<typeof createStoryApi>

export function createStoryApi(gateway: StoryGateway) {
	return {
		async listStories(taskGid: string, opts?: StoryListOptions) {
			if (opts?.createdAfter !== undefined) validateCreatedAfter(opts.createdAfter)
			return await gateway.listStories(taskGid, opts)
		},
		async createStory(taskGid: string, fields: StoryCreateFields, opts?: ReadOptions) {
			// Local shape checks run outside the try: their messages mention html_text, and the
			// catch below would otherwise attribute a never-sent payload to Asana (#99).
			const payload = buildStoryCreateFields({
				text: fields.text,
				htmlText: fields.html_text,
				isPinned: fields.is_pinned,
				stickerName: fields.sticker_name,
				parentComment: fields.parent_comment,
			})
			try {
				return await gateway.createStory(taskGid, payload, opts)
			} catch (error) {
				normalizeStoryCreateError(error)
			}
		},
		getStory(storyGid: string, opts?: ReadOptions) {
			return gateway.getStory(storyGid, opts)
		},
		async updateStory(storyGid: string, fields: StoryUpdateFields, opts?: ReadOptions) {
			// Same reasoning as createStory: validate outside the try so a locally
			// rejected payload is never attributed to Asana.
			const payload = buildStoryUpdateFields({
				text: fields.text,
				htmlText: fields.html_text,
				isPinned: fields.is_pinned,
				stickerName: fields.sticker_name,
			})
			try {
				return await gateway.updateStory(storyGid, payload, opts)
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
		async listGoalStories(goalGid: string, opts?: StoryListOptions) {
			if (opts?.createdAfter !== undefined) validateCreatedAfter(opts.createdAfter)
			return await gateway.listGoalStories(goalGid, opts)
		},
		async createGoalStory(goalGid: string, fields: GoalStoryCreateFields, opts?: ReadOptions) {
			const payload = buildStoryCreateFields({
				text: fields.text,
				htmlText: fields.html_text,
				isPinned: fields.is_pinned,
				stickerName: fields.sticker_name,
			})
			try {
				return await gateway.createGoalStory(goalGid, payload, opts)
			} catch (error) {
				normalizeStoryCreateError(error)
			}
		},
	}
}
