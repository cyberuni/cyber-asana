import { mergeCustomFields, mergeHtmlCustomFields } from '../platform/custom-fields.js'
import {
	PROJECT_ICONS,
	PROJECT_MINIMUM_ACCESS_LEVELS,
	PROJECT_RESOURCE_SUBTYPES,
	type ProjectIcon,
	type ProjectMinimumAccessLevel,
	type ProjectResourceSubtype,
} from './project-enums.js'

type BuildProjectWriteInput = {
	archived?: boolean
	owner?: string
	notes?: string
	htmlNotes?: string
	color?: string
	privacySetting?: 'public_to_workspace' | 'private' | 'private_to_team'
	defaultView?: 'list' | 'board' | 'calendar' | 'timeline'
	defaultAccessLevel?: 'admin' | 'editor' | 'commenter' | 'viewer'
	dueOn?: string
	startOn?: string
	customFields?: Record<string, unknown>
	customFieldsJson?: string
	customFieldEntries?: string[]
	htmlCustomFields?: Record<string, string>
	htmlCustomFieldsJson?: string
	htmlCustomFieldEntries?: string[]
	customType?: string
	resourceSubtype?: string
	icon?: string
	minAccessForCustomization?: string
	minAccessForSharing?: string
}

type BuildProjectCreateInput = BuildProjectWriteInput & {
	/** Comma-separated users (GID, email, or "me"). */
	followerInput?: string
	followerGids?: string[]
}

type BuildProjectUpdateInput = BuildProjectWriteInput & {
	clearOwner?: boolean
	clearDueOn?: boolean
	clearStartOn?: boolean
}

type ProjectCreateFields = {
	archived?: boolean
	owner?: string
	notes?: string
	html_notes?: string
	color?: string
	privacy_setting?: 'public_to_workspace' | 'private' | 'private_to_team'
	default_view?: 'list' | 'board' | 'calendar' | 'timeline'
	default_access_level?: 'admin' | 'editor' | 'commenter' | 'viewer'
	due_on?: string
	start_on?: string
	custom_fields?: Record<string, unknown>
	html_custom_fields?: Record<string, string>
	custom_type?: string
	resource_subtype?: ProjectResourceSubtype
	icon?: ProjectIcon
	minimum_access_level_for_customization?: ProjectMinimumAccessLevel
	minimum_access_level_for_sharing?: ProjectMinimumAccessLevel
	/** Asana takes a comma-separated string of users, and only on create. */
	followers?: string
}

type ProjectUpdateFields = {
	archived?: boolean
	owner?: string | null
	notes?: string
	html_notes?: string
	color?: string
	privacy_setting?: 'public_to_workspace' | 'private' | 'private_to_team'
	default_view?: 'list' | 'board' | 'calendar' | 'timeline'
	default_access_level?: 'admin' | 'editor' | 'commenter' | 'viewer'
	due_on?: string | null
	start_on?: string | null
	custom_fields?: Record<string, unknown>
	html_custom_fields?: Record<string, string>
	custom_type?: string
	resource_subtype?: ProjectResourceSubtype
	icon?: ProjectIcon
	minimum_access_level_for_customization?: ProjectMinimumAccessLevel
	minimum_access_level_for_sharing?: ProjectMinimumAccessLevel
}

function assertOneOf<T extends string>(label: string, allowed: readonly T[], value?: string): T | undefined {
	if (value === undefined) return undefined
	if (!(allowed as readonly string[]).includes(value)) {
		throw new Error(`${label} must be one of: ${allowed.join(', ')}; got "${value}"`)
	}
	return value as T
}

/** The fields create and update share, in Asana's names, so the two cannot drift apart. */
function sharedProjectFields(input: BuildProjectWriteInput) {
	const customFields = { ...input.customFields, ...mergeCustomFields(input.customFieldsJson, input.customFieldEntries) }
	const htmlCustomFields = mergeHtmlCustomFields(input)
	const resourceSubtype = assertOneOf('resource subtype', PROJECT_RESOURCE_SUBTYPES, input.resourceSubtype)
	const icon = assertOneOf('icon', PROJECT_ICONS, input.icon)
	const forCustomization = assertOneOf(
		'minimum access level for customization',
		PROJECT_MINIMUM_ACCESS_LEVELS,
		input.minAccessForCustomization,
	)
	const forSharing = assertOneOf(
		'minimum access level for sharing',
		PROJECT_MINIMUM_ACCESS_LEVELS,
		input.minAccessForSharing,
	)
	return {
		...(Object.keys(customFields).length > 0 && { custom_fields: customFields }),
		...(htmlCustomFields && { html_custom_fields: htmlCustomFields }),
		...(input.customType !== undefined && { custom_type: input.customType }),
		...(resourceSubtype !== undefined && { resource_subtype: resourceSubtype }),
		...(icon !== undefined && { icon }),
		...(forCustomization !== undefined && { minimum_access_level_for_customization: forCustomization }),
		...(forSharing !== undefined && { minimum_access_level_for_sharing: forSharing }),
	}
}

function followersOf(input: BuildProjectCreateInput) {
	const gids = (input.followerGids ?? input.followerInput?.split(',') ?? []).map((gid) => gid.trim()).filter(Boolean)
	return gids.length > 0 ? gids.join(',') : undefined
}

function assertNotesMode(notes?: string, htmlNotes?: string) {
	if (notes !== undefined && htmlNotes !== undefined) {
		throw new Error('--notes and --html-notes are mutually exclusive')
	}
}

function assertProjectDateMode(input: {
	dueOn?: string
	startOn?: string
	clearDueOn?: boolean
	clearStartOn?: boolean
}) {
	if (input.dueOn !== undefined && input.clearDueOn) {
		throw new Error('--due-on and --clear-due-on are mutually exclusive')
	}
	if (input.startOn !== undefined && input.clearStartOn) {
		throw new Error('--start-on and --clear-start-on are mutually exclusive')
	}
	if ((input.startOn !== undefined || input.clearStartOn) && input.dueOn === undefined) {
		throw new Error(`${input.clearStartOn ? '--clear-start-on' : '--start-on'} requires --due-on`)
	}
	if (input.startOn !== undefined && input.dueOn !== undefined && input.startOn === input.dueOn) {
		throw new Error('--start-on and --due-on cannot be the same date')
	}
}

function assertOwnerMode(input: { owner?: string; clearOwner?: boolean }) {
	if (input.owner !== undefined && input.clearOwner) {
		throw new Error('--owner and --clear-owner are mutually exclusive')
	}
}

export function buildProjectCreateFields(input: BuildProjectCreateInput): ProjectCreateFields {
	assertNotesMode(input.notes, input.htmlNotes)
	assertProjectDateMode(input)
	const followers = followersOf(input)
	return {
		...(input.archived !== undefined && { archived: input.archived }),
		...(input.owner !== undefined && { owner: input.owner }),
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.color !== undefined && { color: input.color }),
		...(input.privacySetting !== undefined && { privacy_setting: input.privacySetting }),
		...(input.defaultView !== undefined && { default_view: input.defaultView }),
		...(input.defaultAccessLevel !== undefined && { default_access_level: input.defaultAccessLevel }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.startOn !== undefined && { start_on: input.startOn }),
		...(followers !== undefined && { followers }),
		...sharedProjectFields(input),
	}
}

export function buildProjectUpdateFields(input: BuildProjectUpdateInput): ProjectUpdateFields {
	assertNotesMode(input.notes, input.htmlNotes)
	assertProjectDateMode(input)
	assertOwnerMode(input)
	return {
		...(input.archived !== undefined && { archived: input.archived }),
		...(input.owner !== undefined && { owner: input.owner }),
		...(input.clearOwner !== undefined && { owner: input.clearOwner ? null : input.owner }),
		...(input.notes !== undefined && { notes: input.notes }),
		...(input.htmlNotes !== undefined && { html_notes: input.htmlNotes }),
		...(input.color !== undefined && { color: input.color }),
		...(input.privacySetting !== undefined && { privacy_setting: input.privacySetting }),
		...(input.defaultView !== undefined && { default_view: input.defaultView }),
		...(input.defaultAccessLevel !== undefined && { default_access_level: input.defaultAccessLevel }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
		...(input.clearDueOn !== undefined && { due_on: input.clearDueOn ? null : input.dueOn }),
		...(input.startOn !== undefined && { start_on: input.startOn }),
		...(input.clearStartOn !== undefined && { start_on: input.clearStartOn ? null : input.startOn }),
		...sharedProjectFields(input),
	}
}
