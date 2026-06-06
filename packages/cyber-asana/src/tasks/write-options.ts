import type { CreateTaskFields, UpdateTaskFields } from './api.js'

type BuildTaskWriteInput = {
	notes?: string
	htmlNotes?: string
	dueOn?: string
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
	projectGids?: string[]
	followerGids?: string[]
}

type BuildTaskUpdateInput = BuildTaskWriteInput & {
	name?: string
	completed?: boolean
	clearParent?: boolean
	clearDueOn?: boolean
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

export function buildTaskCreateFields(input: BuildTaskCreateInput): CreateTaskFields {
	assertNotesMode(input.notes, input.htmlNotes)
	const customFields = { ...input.customFields, ...mergeCustomFields(input.customFieldsJson, input.customFieldEntries) }
	const projects = input.projectGids ?? parseGidList(input.projectInput)
	const followers = input.followerGids ?? parseGidList(input.followerInput)
	return {
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.assignee !== undefined && { assignee: input.assignee }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.parent !== undefined && { parent: input.parent }),
		...(input.resourceSubtype !== undefined && { resource_subtype: input.resourceSubtype }),
		...(projects && { projects }),
		...(followers && { followers }),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
	}
}

export function buildTaskUpdateFields(input: BuildTaskUpdateInput): UpdateTaskFields {
	assertNotesMode(input.notes, input.htmlNotes)
	if (input.parent !== undefined && input.clearParent) {
		throw new Error('--parent and --clear-parent are mutually exclusive')
	}
	if (input.dueOn !== undefined && input.clearDueOn) {
		throw new Error('--due-on and --clear-due-on are mutually exclusive')
	}
	const customFields = { ...input.customFields, ...mergeCustomFields(input.customFieldsJson, input.customFieldEntries) }
	return {
		...(input.name !== undefined && { name: input.name }),
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.completed !== undefined && { completed: input.completed }),
		...(input.assignee !== undefined && { assignee: input.assignee }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.clearDueOn !== undefined && { due_on: input.clearDueOn ? null : input.dueOn }),
		...(input.parent !== undefined && { parent: input.parent }),
		...(input.clearParent !== undefined && { clear_parent: input.clearParent }),
		...(input.resourceSubtype !== undefined && { resource_subtype: input.resourceSubtype }),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
	}
}
