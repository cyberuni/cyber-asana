import {
	FIELD_ROLES,
	type FieldRole,
	type ProjectFieldEntry,
	type ProjectFields,
	type RepoConfig,
	setProjectField,
} from './repo-config.js'

/** The custom field shape a project's custom field settings carry. */
export type ProjectCustomField = {
	gid: string
	name: string
	resource_subtype?: string
}

/**
 * Field names that play each role, after lower-casing and collapsing separators to one space.
 * Matching is by name because GIDs differ per workspace; the subtype check keeps a text note
 * that happens to be called "Points" from being mistaken for an estimate.
 */
const ROLE_MATCHERS: Record<FieldRole, { names: RegExp; subtypes: string[] }> = {
	story_points: { names: /^(?:(?:story|task) )?(?:points?|pts)$|^sp$/, subtypes: ['number', 'enum'] },
}

function normalizeFieldName(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim()
}

export function matchFieldRole(field: { name: string; resource_subtype?: string }): FieldRole | undefined {
	const name = normalizeFieldName(field.name)
	return FIELD_ROLES.find((role) => {
		const matcher = ROLE_MATCHERS[role]
		return matcher.names.test(name) && matcher.subtypes.includes(field.resource_subtype ?? '')
	})
}

export type FieldDiscovery = {
	config: RepoConfig
	/** Roles the project's fields now fill, after this discovery. */
	discovered: ProjectFields
	/** Roles more than one field could fill; the saved entry is left as it was. */
	ambiguous: { [K in FieldRole]?: ProjectFieldEntry[] }
}

/**
 * Fold a project's custom fields into its registry entry. A role one field matches is saved.
 * A saved field still on the project is kept even when its name does not match, so a field
 * registered by hand survives a rediscovery; one no longer on the project is dropped.
 */
export function applyFieldDiscovery(
	config: RepoConfig,
	projectGid: string,
	fields: ProjectCustomField[],
): FieldDiscovery {
	const saved = config.projects.find((project) => project.gid === projectGid)?.fields ?? {}
	const ambiguous: FieldDiscovery['ambiguous'] = {}
	let next = config
	for (const role of FIELD_ROLES) {
		const matches = fields.filter((field) => matchFieldRole(field) === role).map(({ gid, name }) => ({ gid, name }))
		const current = fields.find((field) => field.gid === saved[role]?.gid)
		if (matches.length > 1) ambiguous[role] = matches
		const kept = current ? { gid: current.gid, name: current.name } : matches.length === 1 ? matches[0] : undefined
		next = setProjectField(next, projectGid, role, kept ?? null)
	}
	const discovered = next.projects.find((project) => project.gid === projectGid)?.fields ?? {}
	return { config: next, discovered, ambiguous }
}
