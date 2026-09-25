import type { RepoConventions } from '../repo-config.js'
import type { CreateTaskFields, UpdateTaskFields } from './api.js'

type BuildTaskWriteInput = {
	notes?: string
	htmlNotes?: string
	completed?: boolean
	dueOn?: string
	dueAt?: string
	startOn?: string
	startAt?: string
	assignee?: string
	parent?: string
	resourceSubtype?: string
	customFieldsJson?: string
	customFieldEntries?: string[]
	customFields?: Record<string, unknown>
}

type BuildTaskCreateInput = BuildTaskWriteInput & {
	projectInput?: string
	followerInput?: string
	tagInput?: string
	projectGids?: string[]
	followerGids?: string[]
	tagGids?: string[]
}

type BuildTaskUpdateInput = BuildTaskWriteInput & {
	name?: string
	clearParent?: boolean
	clearAssignee?: boolean
	clearDueOn?: boolean
	clearDueAt?: boolean
	clearStartOn?: boolean
	clearStartAt?: boolean
}

export function parseGidList(value?: string) {
	if (!value) return undefined
	const gids = value
		.split(',')
		.map((gid) => gid.trim())
		.filter(Boolean)
	return gids.length > 0 ? gids : undefined
}

function parseCustomFieldsJson(value?: string) {
	if (!value) return undefined
	const parsed = JSON.parse(value)
	if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw new Error('custom fields JSON must be an object')
	}
	return parsed as Record<string, unknown>
}

function parseCustomFieldEntries(entries?: string[]) {
	if (!entries?.length) return undefined
	return Object.fromEntries(
		entries.map((entry) => {
			const separator = entry.indexOf('=')
			if (separator <= 0) throw new Error(`invalid custom field entry: ${entry}`)
			return [entry.slice(0, separator), entry.slice(separator + 1)]
		}),
	)
}

function mergeCustomFields(customFieldsJson?: string, customFieldEntries?: string[]) {
	const fromJson = parseCustomFieldsJson(customFieldsJson)
	const fromEntries = parseCustomFieldEntries(customFieldEntries)
	if (!fromJson && !fromEntries) return undefined
	return { ...fromJson, ...fromEntries }
}

function assertNotesMode(notes?: string, htmlNotes?: string) {
	if (notes !== undefined && htmlNotes !== undefined) {
		throw new Error('--notes and --html-notes are mutually exclusive')
	}
}

// Asana treats the date and date-time forms of a field as one value: `due_at` and `due_on` "should
// not be used together", and neither should `start_at` and `start_on`. Catch it here rather than
// letting Asana silently keep whichever it saw last.
function assertDateModes(input: BuildTaskWriteInput) {
	if (input.dueOn !== undefined && input.dueAt !== undefined) {
		throw new Error('--due-on and --due-at are mutually exclusive')
	}
	if (input.startOn !== undefined && input.startAt !== undefined) {
		throw new Error('--start-on and --start-at are mutually exclusive')
	}
}

export function buildTaskCreateFields(input: BuildTaskCreateInput): CreateTaskFields {
	assertNotesMode(input.notes, input.htmlNotes)
	assertDateModes(input)
	const customFields = { ...input.customFields, ...mergeCustomFields(input.customFieldsJson, input.customFieldEntries) }
	const projects = input.projectGids ?? parseGidList(input.projectInput)
	const followers = input.followerGids ?? parseGidList(input.followerInput)
	const tags = input.tagGids ?? parseGidList(input.tagInput)
	return {
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.completed !== undefined && { completed: input.completed }),
		...(input.assignee !== undefined && { assignee: input.assignee }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.dueAt !== undefined && { due_at: input.dueAt }),
		...(input.startOn !== undefined && { start_on: input.startOn }),
		...(input.startAt !== undefined && { start_at: input.startAt }),
		...(input.parent !== undefined && { parent: input.parent }),
		...(input.resourceSubtype !== undefined && { resource_subtype: input.resourceSubtype }),
		...(projects && { projects }),
		...(followers && { followers }),
		...(tags && { tags }),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
	}
}

/**
 * Fill the gaps in a create payload from the repo's house style. Only fields the caller left
 * unset are touched, so an explicit `--notes` or `--tag` always wins. A template that opens with
 * `<body>` is sent as `html_notes`, matching how Asana tells rich notes from plain ones.
 */
export function applyConventions(fields: CreateTaskFields, conventions?: RepoConventions): CreateTaskFields {
	if (!conventions) return fields
	const next = { ...fields }
	const template = conventions.description_template
	if (template && next.notes === undefined && next.html_notes === undefined) {
		if (template.trimStart().startsWith('<body>')) next.html_notes = template
		else next.notes = template
	}
	if (next.tags === undefined && conventions.default_tags && conventions.default_tags.length > 0) {
		next.tags = conventions.default_tags
	}
	return next
}

export function buildTaskUpdateFields(input: BuildTaskUpdateInput): UpdateTaskFields {
	assertNotesMode(input.notes, input.htmlNotes)
	assertDateModes(input)
	if (input.parent !== undefined && input.clearParent) {
		throw new Error('--parent and --clear-parent are mutually exclusive')
	}
	if (input.assignee !== undefined && input.clearAssignee) {
		throw new Error('--assignee-gid and --clear-assignee are mutually exclusive')
	}
	if (input.dueOn !== undefined && input.clearDueOn) {
		throw new Error('--due-on and --clear-due-on are mutually exclusive')
	}
	if (input.startOn !== undefined && input.clearStartOn) {
		throw new Error('--start-on and --clear-start-on are mutually exclusive')
	}
	if (input.dueAt !== undefined && input.clearDueAt) {
		throw new Error('--due-at and --clear-due-at are mutually exclusive')
	}
	if (input.startAt !== undefined && input.clearStartAt) {
		throw new Error('--start-at and --clear-start-at are mutually exclusive')
	}
	const customFields = { ...input.customFields, ...mergeCustomFields(input.customFieldsJson, input.customFieldEntries) }
	return {
		...(input.name !== undefined && { name: input.name }),
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.completed !== undefined && { completed: input.completed }),
		...(input.assignee !== undefined && { assignee: input.assignee }),
		...(input.clearAssignee && { assignee: null }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.clearDueOn !== undefined && { due_on: input.clearDueOn ? null : input.dueOn }),
		...(input.startOn !== undefined && { start_on: input.startOn }),
		...(input.clearStartOn !== undefined && { start_on: input.clearStartOn ? null : input.startOn }),
		...(input.dueAt !== undefined && { due_at: input.dueAt }),
		...(input.clearDueAt && { due_at: null }),
		...(input.startAt !== undefined && { start_at: input.startAt }),
		...(input.clearStartAt && { start_at: null }),
		...(input.parent !== undefined && { parent: input.parent }),
		...(input.clearParent !== undefined && { clear_parent: input.clearParent }),
		...(input.resourceSubtype !== undefined && { resource_subtype: input.resourceSubtype }),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
	}
}
