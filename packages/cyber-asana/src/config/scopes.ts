/**
 * A scrum scope: the Asana projects a scrum team works in (§ 6 of docs/design/scrum-system.md).
 * Scopes name Asana objects by GID, so they live in config beside projects, never in a reference.
 * This module holds the shape, its validation, and the pure edits; reading and writing the file
 * belongs to `repo-config.ts` and `global-config.ts`.
 */

export const SCOPE_KINDS = ['project', 'projects', 'portfolio', 'team'] as const

export type ScopeKind = (typeof SCOPE_KINDS)[number]

/** The only policy keys a scope may override; they depend on how that team's Asana is built. */
export const SCOPE_OVERRIDE_KEYS = ['sprint_model', 'sprint_length_days', 'sprint_anchor_date'] as const

export type ScopeEntry = {
	name: string
	kind: ScopeKind
	/** Project GIDs: exactly one for `project`, at least one for `projects`. */
	projects?: string[]
	/** The portfolio GID of a `portfolio` scope. */
	portfolio?: string
	/** The team GID of a `team` scope. */
	team?: string
	/** Marks the scope used when a command is not given `--scope`. At most one per list. */
	default?: true
	sprint_model?: string
	sprint_length_days?: number
	/** The first day of sprint 1, `YYYY-MM-DD`. */
	sprint_anchor_date?: string
	/** The `project` model's backlog project GID; a `project` scope's own project when unset. */
	backlog_project?: string
	/** The `project` model's portfolio of sprint projects; a `portfolio` scope's own portfolio when unset. */
	sprint_portfolio?: string
	/** A project GID the `project` model duplicates to start a sprint; a plain project is created when unset. */
	sprint_template?: string
}

export type ScrumBlock = { scopes: ScopeEntry[] }

/** Asana objects the `project` sprint model works on; GIDs, so they live in config (P1). */
const SCOPE_PROJECT_MODEL_KEYS = ['backlog_project', 'sprint_portfolio', 'sprint_template'] as const

const SCOPE_KEYS = [
	'name',
	'kind',
	'projects',
	'portfolio',
	'team',
	'default',
	...SCOPE_OVERRIDE_KEYS,
	...SCOPE_PROJECT_MODEL_KEYS,
]

export function normalizeScopeName(name: string): string {
	return name.trim().toLowerCase()
}

function isCalendarDate(value: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
	const date = new Date(`${value}T00:00:00Z`)
	return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function parseScopeEntry(entry: unknown, label: string): ScopeEntry {
	if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
		throw new Error(`${label} must be an object`)
	}
	const scope = entry as Record<string, unknown>
	if (typeof scope.name !== 'string' || scope.name.trim().length === 0) {
		throw new Error(`${label}.name must be a non-empty string`)
	}
	if (!(SCOPE_KINDS as readonly unknown[]).includes(scope.kind)) {
		throw new Error(`${label}.kind must be one of ${SCOPE_KINDS.join(', ')}`)
	}
	const kind = scope.kind as ScopeKind
	for (const key of Object.keys(scope)) {
		if (!SCOPE_KEYS.includes(key)) {
			throw new Error(
				`Unknown scope key ${label}.${key}; a scope may set only ${SCOPE_OVERRIDE_KEYS.join(', ')} beyond its name, kind, and members (and ${SCOPE_PROJECT_MODEL_KEYS.join(', ')} for the project sprint model)`,
			)
		}
	}
	const entryOut: ScopeEntry = { name: scope.name, kind }

	if (kind === 'portfolio') {
		if (scope.projects !== undefined) throw new Error(`${label}.projects is not allowed on a portfolio scope`)
		if (scope.team !== undefined) throw new Error(`${label}.team is not allowed on a portfolio scope`)
		if (typeof scope.portfolio !== 'string' || scope.portfolio.length === 0) {
			throw new Error(`${label}.portfolio must be a non-empty string`)
		}
		entryOut.portfolio = scope.portfolio
	} else if (kind === 'team') {
		if (scope.projects !== undefined) throw new Error(`${label}.projects is not allowed on a team scope`)
		if (scope.portfolio !== undefined) throw new Error(`${label}.portfolio is not allowed on a team scope`)
		if (typeof scope.team !== 'string' || scope.team.length === 0) {
			throw new Error(`${label}.team must be a non-empty string`)
		}
		entryOut.team = scope.team
	} else {
		if (scope.portfolio !== undefined) throw new Error(`${label}.portfolio is not allowed on a ${kind} scope`)
		if (scope.team !== undefined) throw new Error(`${label}.team is not allowed on a ${kind} scope`)
		const projects = scope.projects
		if (!Array.isArray(projects) || projects.some((gid) => typeof gid !== 'string' || gid.length === 0)) {
			throw new Error(`${label}.projects must be an array of non-empty project GID strings`)
		}
		if (kind === 'project' && projects.length !== 1) {
			throw new Error(`${label} of kind project needs exactly one project; use kind projects for several`)
		}
		if (projects.length === 0) throw new Error(`${label} of kind projects needs at least one project`)
		entryOut.projects = [...new Set(projects as string[])]
	}

	if (scope.default !== undefined && scope.default !== true) {
		throw new Error(`${label}.default must be true when present`)
	}
	if (scope.default === true) entryOut.default = true
	if (scope.sprint_model !== undefined) {
		if (typeof scope.sprint_model !== 'string' || scope.sprint_model.length === 0) {
			throw new Error(`${label}.sprint_model must be a non-empty string`)
		}
		entryOut.sprint_model = scope.sprint_model
	}
	if (scope.sprint_length_days !== undefined) {
		if (!Number.isInteger(scope.sprint_length_days) || (scope.sprint_length_days as number) <= 0) {
			throw new Error(`${label}.sprint_length_days must be a positive integer`)
		}
		entryOut.sprint_length_days = scope.sprint_length_days as number
	}
	if (scope.sprint_anchor_date !== undefined) {
		if (typeof scope.sprint_anchor_date !== 'string' || !isCalendarDate(scope.sprint_anchor_date)) {
			throw new Error(`${label}.sprint_anchor_date must be a YYYY-MM-DD date`)
		}
		entryOut.sprint_anchor_date = scope.sprint_anchor_date
	}
	for (const key of SCOPE_PROJECT_MODEL_KEYS) {
		const value = scope[key]
		if (value === undefined) continue
		if (typeof value !== 'string' || value.length === 0) throw new Error(`${label}.${key} must be a non-empty string`)
		entryOut[key] = value
	}
	return entryOut
}

/** Parse a scope list, shared by the repo config's `scrum.scopes` and the global registry's per-repo `scopes`. */
export function parseScopeEntries(raw: unknown, label: string): ScopeEntry[] {
	if (!Array.isArray(raw)) throw new Error(`${label} must be an array`)
	const scopes = raw.map((entry, index) => parseScopeEntry(entry, `${label}[${index}]`))
	const seen = new Map<string, string>()
	for (const scope of scopes) {
		const key = normalizeScopeName(scope.name)
		const owner = seen.get(key)
		if (owner !== undefined) throw new Error(`Scope name "${scope.name}" is already used by scope "${owner}"`)
		seen.set(key, scope.name)
	}
	const defaults = scopes.filter((scope) => scope.default)
	if (defaults.length > 1) {
		throw new Error(
			`Only one scope may be marked default; found ${defaults.length}: ${defaults.map((s) => s.name).join(', ')}`,
		)
	}
	return scopes
}

/** Add a scope, or replace the one with the same name. A scope that claims `default` takes it from the others. */
export function upsertScope(scopes: ScopeEntry[], entry: ScopeEntry): ScopeEntry[] {
	const [valid] = parseScopeEntries([entry], 'scope') as [ScopeEntry]
	const key = normalizeScopeName(valid.name)
	const kept = scopes
		.filter((scope) => normalizeScopeName(scope.name) !== key)
		.map(({ default: claimed, ...rest }) => (valid.default || !claimed ? rest : { ...rest, default: true as const }))
	const index = scopes.findIndex((scope) => normalizeScopeName(scope.name) === key)
	if (index === -1) return [...kept, valid]
	const before = scopes.slice(0, index).filter((scope) => normalizeScopeName(scope.name) !== key).length
	return [...kept.slice(0, before), valid, ...kept.slice(before)]
}

export function dropScope(scopes: ScopeEntry[], name: string): ScopeEntry[] {
	const key = normalizeScopeName(name)
	if (!scopes.some((scope) => normalizeScopeName(scope.name) === key)) {
		throw new Error(
			`Scope "${name}" is not configured; known scopes: ${scopes.map((s) => s.name).join(', ') || '(none)'}`,
		)
	}
	return scopes.filter((scope) => normalizeScopeName(scope.name) !== key)
}

/**
 * Union a repo's scopes with the global registry's for that repo. The repo wins a name clash, as
 * projects do, and the merged list carries one `default`: the repo's when it has one, else the global's.
 */
export function mergeScopes(local: ScopeEntry[], global: ScopeEntry[]): ScopeEntry[] {
	const localNames = new Set(local.map((scope) => normalizeScopeName(scope.name)))
	const merged = [...local, ...global.filter((scope) => !localNames.has(normalizeScopeName(scope.name)))]
	const chosen = merged.find((scope) => scope.default && local.includes(scope)) ?? merged.find((scope) => scope.default)
	return merged.map(({ default: marked, ...rest }) =>
		marked && scopeIs(chosen, rest.name) ? { ...rest, default: true as const } : rest,
	)
}

function scopeIs(scope: ScopeEntry | undefined, name: string): boolean {
	return scope !== undefined && scope.name === name
}

export function defaultScope(scopes: ScopeEntry[]): ScopeEntry | undefined {
	return scopes.find((scope) => scope.default)
}
