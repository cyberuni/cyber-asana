import type { RepoConventions } from '../config/conventions.js'
import type { TaskSectionPlacement } from '../config/repo-config.js'
import type { CreateTaskFields, UpdateTaskFields } from './api.js'
import { APPROVAL_STATUSES, type ApprovalStatus } from './approval-status.js'

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
	customType?: string
	customFieldsJson?: string
	customFieldEntries?: string[]
	customFields?: Record<string, unknown>
	approvalStatus?: string
	assigneeSection?: string
	customTypeStatusOption?: string
	htmlCustomFieldsJson?: string
	htmlCustomFieldEntries?: string[]
	htmlCustomFields?: Record<string, string>
	liked?: boolean
	externalGid?: string
	externalData?: string
}

type BuildTaskCreateInput = BuildTaskWriteInput & {
	projectInput?: string
	followerInput?: string
	projectGids?: string[]
	followerGids?: string[]
	tagGids?: string[]
}

type BuildTaskUpdateInput = BuildTaskWriteInput & {
	name?: string
	clearParent?: boolean
	insertBefore?: string
	insertAfter?: string
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

function parseHtmlCustomFieldsJson(value?: string) {
	if (!value) return undefined
	const parsed = JSON.parse(value)
	if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
		throw new Error('html custom fields JSON must be an object')
	}
	for (const [gid, html] of Object.entries(parsed)) {
		if (typeof html !== 'string') throw new Error(`html custom field ${gid} must be a string of HTML`)
	}
	return parsed as Record<string, string>
}

function parseHtmlCustomFieldEntries(entries?: string[]) {
	if (!entries?.length) return undefined
	return Object.fromEntries(
		entries.map((entry) => {
			const separator = entry.indexOf('=')
			if (separator <= 0) throw new Error(`invalid html custom field entry: ${entry}`)
			return [entry.slice(0, separator), entry.slice(separator + 1)]
		}),
	)
}

function mergeHtmlCustomFields(input: BuildTaskWriteInput) {
	const merged = {
		...input.htmlCustomFields,
		...parseHtmlCustomFieldsJson(input.htmlCustomFieldsJson),
		...parseHtmlCustomFieldEntries(input.htmlCustomFieldEntries),
	}
	return Object.keys(merged).length > 0 ? merged : undefined
}

function assertApprovalStatus(value?: string): ApprovalStatus | undefined {
	if (value === undefined) return undefined
	if (!(APPROVAL_STATUSES as readonly string[]).includes(value)) {
		throw new Error(`approval status must be one of: ${APPROVAL_STATUSES.join(', ')}; got "${value}"`)
	}
	return value as ApprovalStatus
}

/** The task fields create and update share, in Asana's names, so the two cannot drift apart. */
function sharedTaskFields(input: BuildTaskWriteInput) {
	const approvalStatus = assertApprovalStatus(input.approvalStatus)
	const htmlCustomFields = mergeHtmlCustomFields(input)
	const external =
		input.externalGid !== undefined || input.externalData !== undefined
			? {
					...(input.externalGid !== undefined && { gid: input.externalGid }),
					...(input.externalData !== undefined && { data: input.externalData }),
				}
			: undefined
	return {
		...(approvalStatus !== undefined && { approval_status: approvalStatus }),
		...(input.assigneeSection !== undefined && { assignee_section: input.assigneeSection }),
		...(input.customTypeStatusOption !== undefined && { custom_type_status_option: input.customTypeStatusOption }),
		...(htmlCustomFields && { html_custom_fields: htmlCustomFields }),
		...(input.liked !== undefined && { liked: input.liked }),
		...(external && { external }),
	}
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
	const tags = input.tagGids
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
		...(input.customType !== undefined && { custom_type: input.customType }),
		...(projects && { projects }),
		...(followers && { followers }),
		...(tags && { tags }),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
		...sharedTaskFields(input),
	}
}

/**
 * Fill the description of a create payload from the repo's house style, when the caller gave
 * none. A template that opens with `<body>` is sent as `html_notes`, matching how Asana tells
 * rich notes from plain ones. Tags are not handled here: `default_tags` may name a tag, and
 * resolving a name needs the workspace, so the create path resolves tags before building fields.
 */
export function applyConventions(fields: CreateTaskFields, conventions?: RepoConventions): CreateTaskFields {
	if (!conventions) return fields
	const next = { ...fields }
	const template = conventions.description_template
	if (template && next.notes === undefined && next.html_notes === undefined) {
		if (template.trimStart().startsWith('<body>')) next.html_notes = template
		else next.notes = template
	}
	return next
}

/**
 * Put a new task straight into a section by moving its project from `projects` into a
 * `memberships` entry, so placement happens in the create call and cannot fail on its own.
 */
export function placeInSection(fields: CreateTaskFields, placement?: TaskSectionPlacement): CreateTaskFields {
	if (!placement) return fields
	const { projects, ...rest } = fields
	const others = projects?.filter((gid) => gid !== placement.project) ?? []
	return {
		...rest,
		...(others.length > 0 && { projects: others }),
		memberships: [...(fields.memberships ?? []), placement],
	}
}

/** Exactly one anchor, or none, as `setParent` takes. Shared by `task update` and `task reorder`. */
export function assertOnePosition(position: { insertBefore?: string; insertAfter?: string }) {
	if (position.insertBefore !== undefined && position.insertAfter !== undefined) {
		throw new Error('--insert-before and --insert-after are mutually exclusive')
	}
}

// A position only means something next to the parent it is relative to; moving within the
// current parent is `task reorder`, which reads that parent first.
function assertPosition(input: BuildTaskUpdateInput) {
	assertOnePosition(input)
	if (input.parent !== undefined) return
	const flag =
		input.insertBefore !== undefined
			? '--insert-before'
			: input.insertAfter !== undefined
				? '--insert-after'
				: undefined
	if (flag) throw new Error(`${flag} needs --parent; to move a subtask within its current parent, use \`task reorder\``)
}

export function buildTaskUpdateFields(input: BuildTaskUpdateInput): UpdateTaskFields {
	assertNotesMode(input.notes, input.htmlNotes)
	assertDateModes(input)
	if (input.parent !== undefined && input.clearParent) {
		throw new Error('--parent and --clear-parent are mutually exclusive')
	}
	assertPosition(input)
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
		...(input.insertBefore !== undefined && { insert_before: input.insertBefore }),
		...(input.insertAfter !== undefined && { insert_after: input.insertAfter }),
		...(input.resourceSubtype !== undefined && { resource_subtype: input.resourceSubtype }),
		...(input.customType !== undefined && { custom_type: input.customType }),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
		...sharedTaskFields(input),
	}
}
