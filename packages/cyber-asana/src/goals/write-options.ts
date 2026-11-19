import { mergeCustomFields, mergeHtmlCustomFields } from '../platform/custom-fields.js'
import type { CreateGoalFields, UpdateGoalFields } from './api.js'
import { GOAL_STATUSES, type GoalStatus } from './gateway.js'

type BuildGoalWriteInput = {
	notes?: string
	htmlNotes?: string
	dueOn?: string
	startOn?: string
	timePeriod?: string
	owner?: string
	team?: string
	isWorkspaceLevel?: boolean
	liked?: boolean
}

type BuildGoalCreateInput = BuildGoalWriteInput & {
	/** Comma-separated users (GID, email, or "me"). */
	followerInput?: string
	followerGids?: string[]
}

type BuildGoalUpdateInput = BuildGoalWriteInput & {
	name?: string
	clearDueOn?: boolean
	clearStartOn?: boolean
	status?: string
	customFieldsJson?: string
	customFieldEntries?: string[]
	htmlCustomFields?: Record<string, string>
	htmlCustomFieldsJson?: string
	htmlCustomFieldEntries?: string[]
	customFields?: Record<string, unknown>
}

function sharedGoalFields(input: BuildGoalWriteInput) {
	return {
		...(input.timePeriod !== undefined && { time_period: input.timePeriod }),
		...(input.owner !== undefined && { owner: input.owner }),
		...(input.team !== undefined && { team: input.team }),
		...(input.isWorkspaceLevel !== undefined && { is_workspace_level: input.isWorkspaceLevel }),
		...(input.liked !== undefined && { liked: input.liked }),
	}
}

function assertStatus(value?: string): GoalStatus | undefined {
	if (value === undefined) return undefined
	if (!(GOAL_STATUSES as readonly string[]).includes(value)) {
		throw new Error(`status must be one of: ${GOAL_STATUSES.join(', ')}; got "${value}"`)
	}
	return value as GoalStatus
}

function followersOf(input: BuildGoalCreateInput) {
	const gids = (input.followerGids ?? input.followerInput?.split(',') ?? []).map((gid) => gid.trim()).filter(Boolean)
	return gids.length > 0 ? gids : undefined
}

function assertNotesMode(notes?: string, htmlNotes?: string) {
	if (notes !== undefined && htmlNotes !== undefined) {
		throw new Error('--notes and --html-notes are mutually exclusive')
	}
}

export function buildGoalCreateFields(input: BuildGoalCreateInput): CreateGoalFields {
	assertNotesMode(input.notes, input.htmlNotes)
	const followers = followersOf(input)
	return {
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.startOn !== undefined && { start_on: input.startOn }),
		...sharedGoalFields(input),
		...(followers && { followers }),
	}
}

export function buildGoalUpdateFields(input: BuildGoalUpdateInput): UpdateGoalFields {
	assertNotesMode(input.notes, input.htmlNotes)
	if (input.dueOn !== undefined && input.clearDueOn) {
		throw new Error('--due-on and --clear-due-on are mutually exclusive')
	}
	if (input.startOn !== undefined && input.clearStartOn) {
		throw new Error('--start-on and --clear-start-on are mutually exclusive')
	}
	const status = assertStatus(input.status)
	const customFields = { ...input.customFields, ...mergeCustomFields(input.customFieldsJson, input.customFieldEntries) }
	const htmlCustomFields = mergeHtmlCustomFields(input)
	return {
		...(input.name !== undefined && { name: input.name }),
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.clearDueOn !== undefined && { due_on: input.clearDueOn ? null : input.dueOn }),
		...(input.startOn !== undefined && { start_on: input.startOn }),
		...(input.clearStartOn !== undefined && { start_on: input.clearStartOn ? null : input.startOn }),
		...sharedGoalFields(input),
		...(status !== undefined && { status }),
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
		...(htmlCustomFields && { html_custom_fields: htmlCustomFields }),
	}
}
