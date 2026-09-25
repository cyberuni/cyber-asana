import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export const DEFAULT_CONFIG_RELATIVE_PATH = join('.agents', 'cyber-asana.json')

export type RepoProjectEntry = {
	gid: string
	name: string
	/** Trigger keywords that resolve to this project, in addition to its display name. */
	aliases: string[]
	/** One line telling an agent what belongs here, so it can route work without asking. */
	purpose?: string
	/** Marks the project commands fall back to when none is given. At most one per config. */
	default?: true
}

export type RepoUserEntry = {
	gid: string
	name: string
	email?: string
	aliases: string[]
}

/** Fallbacks for what a command was not told. The default project is the entry marked `default`. */
export type RepoDefaults = {
	/** A user GID, alias, email, or name, resolved through the user registry. */
	assignee?: string
	/** Workspace GID, used when neither `--workspace` nor `ASANA_WORKSPACE_GID` is set. */
	workspace?: string
	/** Section GID in the default project that new tasks land in. */
	section?: string
}

/** Repo house style, so an agent writes tasks the way this repo writes them. */
export type RepoConventions = {
	/** A task title shape, e.g. `<area>: <summary>`. */
	task_name_format?: string
	/** A description skeleton new tasks start from. */
	description_template?: string
	/** Tag GIDs or names applied to new tasks. */
	default_tags?: string[]
}

export type RepoConfig = {
	schema_version: 2
	projects: RepoProjectEntry[]
	users?: RepoUserEntry[]
	defaults?: RepoDefaults
	conventions?: RepoConventions
}

const DEFAULTS_KEYS = ['assignee', 'workspace', 'section'] as const
const CONVENTIONS_KEYS = ['task_name_format', 'description_template', 'default_tags'] as const

export type ProjectObservation = {
	gid: string
	name: string
}

export function createEmptyRepoConfig(): RepoConfig {
	return { schema_version: 2, projects: [] }
}

export function normalizeProjectName(name: string): string {
	return name.trim().toLowerCase()
}

export function parseRepoConfig(raw: unknown): RepoConfig {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Repo config must be a JSON object')
	}
	const record = raw as Record<string, unknown>
	if (record.schema_version !== 1 && record.schema_version !== 2) {
		throw new Error('Unsupported or missing schema_version; expected 1 or 2')
	}
	const projects = parseProjectEntries(record.projects, 'projects')
	const defaults = projects.filter((project) => project.default)
	if (defaults.length > 1) {
		const named = defaults.map((project) => `${project.gid} (${project.name})`).join(', ')
		throw new Error(`Repo config may mark only one default project; found ${defaults.length}: ${named}`)
	}
	const extras = {
		...(record.defaults !== undefined && { defaults: parseDefaults(record.defaults) }),
		...(record.conventions !== undefined && { conventions: parseConventions(record.conventions) }),
	}
	if (record.users === undefined) {
		return { schema_version: 2, projects, ...extras }
	}
	if (!Array.isArray(record.users)) {
		throw new Error('Repo config users must be an array')
	}
	const users = record.users.map((entry, index) => parseUserEntry(entry, index))
	return { schema_version: 2, projects, users, ...extras }
}

/** Unknown keys are rejected rather than ignored, so a typo reports itself instead of doing nothing. */
function parseDefaults(raw: unknown): RepoDefaults {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		throw new Error('Repo config defaults must be an object')
	}
	const defaults: RepoDefaults = {}
	for (const [key, value] of Object.entries(raw)) {
		if (!(DEFAULTS_KEYS as readonly string[]).includes(key)) {
			throw new Error(`Unknown repo config key defaults.${key}; expected one of ${DEFAULTS_KEYS.join(', ')}`)
		}
		if (typeof value !== 'string' || value.length === 0) {
			throw new Error(`defaults.${key} must be a non-empty string`)
		}
		defaults[key as (typeof DEFAULTS_KEYS)[number]] = value
	}
	return defaults
}

function parseConventions(raw: unknown): RepoConventions {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		throw new Error('Repo config conventions must be an object')
	}
	const conventions: RepoConventions = {}
	for (const [key, value] of Object.entries(raw)) {
		if (!(CONVENTIONS_KEYS as readonly string[]).includes(key)) {
			throw new Error(`Unknown repo config key conventions.${key}; expected one of ${CONVENTIONS_KEYS.join(', ')}`)
		}
		if (key === 'default_tags') {
			if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string' || tag.length === 0)) {
				throw new Error('conventions.default_tags must be an array of non-empty strings')
			}
			conventions.default_tags = value as string[]
			continue
		}
		if (typeof value !== 'string' || value.length === 0) {
			throw new Error(`conventions.${key} must be a non-empty string`)
		}
		conventions[key as 'task_name_format' | 'description_template'] = value
	}
	return conventions
}

/** Merge a patch into a block; a `null` value clears that key, and an emptied block is dropped. */
function patchBlock<T extends object>(block: T | undefined, patch: { [K in keyof T]?: T[K] | null }): T | undefined {
	const next = { ...(block ?? ({} as T)) }
	for (const [key, value] of Object.entries(patch) as Array<[keyof T, T[keyof T] | null | undefined]>) {
		if (value === undefined) continue
		if (value === null) delete next[key]
		else next[key] = value
	}
	return Object.keys(next).length === 0 ? undefined : next
}

export function setDefaults(config: RepoConfig, patch: { [K in keyof RepoDefaults]?: RepoDefaults[K] | null }) {
	const defaults = patchBlock(config.defaults, patch)
	const { defaults: _drop, ...rest } = config
	return (defaults ? { ...rest, defaults } : rest) as RepoConfig
}

export function setConventions(
	config: RepoConfig,
	patch: { [K in keyof RepoConventions]?: RepoConventions[K] | null },
) {
	const conventions = patchBlock(config.conventions, patch)
	const { conventions: _drop, ...rest } = config
	return (conventions ? { ...rest, conventions } : rest) as RepoConfig
}

/**
 * Parse a project entry array, shared by the repo config and the global registry's per-repo
 * lists. Reads both schema versions: a version 1 entry simply carries no aliases, purpose, or
 * default marker, and comes back with an empty alias list.
 */
export function parseProjectEntries(raw: unknown, label: string): RepoProjectEntry[] {
	if (!Array.isArray(raw)) {
		throw new Error(`${label} must be an array`)
	}
	return raw.map((entry, index) => {
		if (!entry || typeof entry !== 'object') {
			throw new Error(`${label}[${index}] must be an object`)
		}
		const project = entry as Record<string, unknown>
		if (typeof project.gid !== 'string' || project.gid.length === 0) {
			throw new Error(`${label}[${index}].gid must be a non-empty string`)
		}
		if (typeof project.name !== 'string' || project.name.length === 0) {
			throw new Error(`${label}[${index}].name must be a non-empty string`)
		}
		const aliases = project.aliases ?? []
		if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== 'string' || alias.length === 0)) {
			throw new Error(`${label}[${index}].aliases must be an array of non-empty strings`)
		}
		if (project.purpose !== undefined && (typeof project.purpose !== 'string' || project.purpose.length === 0)) {
			throw new Error(`${label}[${index}].purpose must be a non-empty string`)
		}
		if (project.default !== undefined && project.default !== true) {
			throw new Error(`${label}[${index}].default must be true when present`)
		}
		return {
			gid: project.gid,
			name: project.name,
			aliases: aliases as string[],
			...(project.purpose !== undefined && { purpose: project.purpose as string }),
			...(project.default === true && { default: true as const }),
		}
	})
}

/** Parse one `{ gid, name, email?, aliases }` user entry, shared by the repo config and the global registry's flat user list. */
export function parseUserEntry(entry: unknown, index: number): RepoUserEntry {
	if (!entry || typeof entry !== 'object') {
		throw new Error(`users[${index}] must be an object`)
	}
	const user = entry as Record<string, unknown>
	if (typeof user.gid !== 'string' || user.gid.length === 0) {
		throw new Error(`users[${index}].gid must be a non-empty string`)
	}
	if (typeof user.name !== 'string' || user.name.length === 0) {
		throw new Error(`users[${index}].name must be a non-empty string`)
	}
	if (user.email !== undefined && typeof user.email !== 'string') {
		throw new Error(`users[${index}].email must be a string`)
	}
	const aliases = user.aliases ?? []
	if (!Array.isArray(aliases) || aliases.some((alias) => typeof alias !== 'string' || alias.length === 0)) {
		throw new Error(`users[${index}].aliases must be an array of non-empty strings`)
	}
	return {
		gid: user.gid,
		name: user.name,
		...(user.email !== undefined && { email: user.email }),
		aliases: aliases as string[],
	}
}

/**
 * Resolve a GID, alias, or display name to one registered project. Matching is case-insensitive
 * and tiered in that order, so an explicitly registered alias wins over another project's display
 * name. Throws when the deciding tier matches more than one project.
 */
export function resolveProject(config: RepoConfig, query: { name?: string; gid?: string }): RepoProjectEntry | null {
	if (query.gid) {
		return config.projects.find((project) => project.gid === query.gid) ?? null
	}
	if (!query.name) {
		return null
	}
	const normalized = normalizeProjectName(query.name)
	const tiers: Array<(project: RepoProjectEntry) => boolean> = [
		(project) => project.gid === query.name?.trim(),
		(project) => project.aliases.some((alias) => normalizeProjectName(alias) === normalized),
		(project) => normalizeProjectName(project.name) === normalized,
	]
	for (const matches of tiers) {
		const found = config.projects.filter(matches)
		if (found.length === 1) return found[0] as RepoProjectEntry
		if (found.length > 1) {
			const candidates = found.map((project) => `${project.gid} (${project.name})`).join(', ')
			throw new Error(
				`"${query.name}" matches ${found.length} registered projects: ${candidates}. Use an alias or GID instead.`,
			)
		}
	}
	return null
}

/** The project marked `default: true`, which commands fall back to when none is given. */
export function defaultProject(config: RepoConfig): RepoProjectEntry | null {
	return config.projects.find((project) => project.default) ?? null
}

/** Move the default marker onto one registered project, clearing it everywhere else. */
export function setDefaultProject(config: RepoConfig, gid: string): RepoConfig {
	if (!config.projects.some((project) => project.gid === gid)) {
		throw new Error(`Project ${gid} is not registered in the repo config`)
	}
	return {
		...config,
		projects: config.projects.map((project) => {
			const { default: _drop, ...rest } = project
			return project.gid === gid ? { ...rest, default: true as const } : rest
		}),
	}
}

/** Leave no project marked as the default. */
export function clearDefaultProject(config: RepoConfig): RepoConfig {
	return {
		...config,
		projects: config.projects.map(({ default: _drop, ...rest }) => rest),
	}
}

export function observeProject(
	config: RepoConfig,
	observation: ProjectObservation,
): { updated: boolean; config: RepoConfig } {
	const index = config.projects.findIndex((project) => project.gid === observation.gid)
	const existing = config.projects[index]
	if (!existing || existing.name === observation.name) {
		return { updated: false, config }
	}
	const projects = config.projects.slice()
	projects[index] = { ...existing, name: observation.name }
	return { updated: true, config: { ...config, projects } }
}

/**
 * Add a project, or refresh an existing one's name and merge in new aliases and purpose.
 * An alias identifies exactly one project, so one already registered elsewhere is rejected.
 */
export function addProject(config: RepoConfig, entry: RepoProjectEntry): RepoConfig {
	for (const alias of entry.aliases) {
		const normalized = normalizeProjectName(alias)
		const owner = config.projects.find(
			(project) => project.gid !== entry.gid && project.aliases.some((a) => normalizeProjectName(a) === normalized),
		)
		if (owner) {
			throw new Error(`alias "${alias}" is already registered to project ${owner.gid} (${owner.name})`)
		}
	}
	const index = config.projects.findIndex((project) => project.gid === entry.gid)
	if (index === -1) {
		return { ...config, projects: [...config.projects, entry] }
	}
	const existing = config.projects[index] as RepoProjectEntry
	const aliases = [...existing.aliases]
	for (const alias of entry.aliases) {
		if (!aliases.some((a) => normalizeProjectName(a) === normalizeProjectName(alias))) aliases.push(alias)
	}
	const purpose = entry.purpose ?? existing.purpose
	const projects = config.projects.slice()
	projects[index] = {
		gid: entry.gid,
		name: entry.name,
		aliases,
		...(purpose !== undefined && { purpose }),
		...(existing.default && { default: true as const }),
	}
	return { ...config, projects }
}

export function removeProject(config: RepoConfig, query: { gid?: string; name?: string }): RepoConfig {
	const target = resolveProject(config, query)
	if (!target) {
		return config
	}
	return { ...config, projects: config.projects.filter((project) => project.gid !== target.gid) }
}

/**
 * Drop aliases from whichever projects own them. An alias is unique, so no project query is
 * needed. All aliases are checked first, so an unregistered one leaves the config unchanged.
 */
export function removeProjectAliases(config: RepoConfig, aliases: string[]): RepoConfig {
	const targets = aliases.map(normalizeProjectName)
	for (const [i, target] of targets.entries()) {
		if (!config.projects.some((project) => project.aliases.some((a) => normalizeProjectName(a) === target))) {
			throw new Error(`alias "${aliases[i]}" is not registered`)
		}
	}
	return {
		...config,
		projects: config.projects.map((project) => ({
			...project,
			aliases: project.aliases.filter((a) => !targets.includes(normalizeProjectName(a))),
		})),
	}
}

export type UserObservation = {
	gid: string
	name: string
	email?: string
}

/**
 * Add a user, or refresh an existing one's name and email and merge in new aliases.
 * An alias identifies exactly one user, so one already registered to another GID is rejected.
 */
export function addUser(config: RepoConfig, entry: RepoUserEntry): RepoConfig {
	const users = config.users ?? []
	for (const alias of entry.aliases) {
		const normalized = normalizeProjectName(alias)
		const owner = users.find(
			(user) => user.gid !== entry.gid && user.aliases.some((a) => normalizeProjectName(a) === normalized),
		)
		if (owner) {
			throw new Error(`alias "${alias}" is already registered to user ${owner.gid} (${owner.name})`)
		}
	}
	const index = users.findIndex((user) => user.gid === entry.gid)
	if (index === -1) {
		return { ...config, users: [...users, entry] }
	}
	const existing = users[index] as RepoUserEntry
	const aliases = [...existing.aliases]
	for (const alias of entry.aliases) {
		if (!aliases.some((a) => normalizeProjectName(a) === normalizeProjectName(alias))) aliases.push(alias)
	}
	const next = users.slice()
	next[index] = { gid: entry.gid, name: entry.name, ...(entry.email !== undefined && { email: entry.email }), aliases }
	return { ...config, users: next }
}

/**
 * Drop aliases from whichever users own them. An alias is unique, so no user query is needed.
 * All aliases are checked first, so an unregistered one leaves the config unchanged.
 */
export function removeAliases(config: RepoConfig, aliases: string[]): RepoConfig {
	const users = config.users ?? []
	const targets = aliases.map(normalizeProjectName)
	for (const [i, target] of targets.entries()) {
		if (!users.some((user) => user.aliases.some((a) => normalizeProjectName(a) === target))) {
			throw new Error(`alias "${aliases[i]}" is not registered`)
		}
	}
	return {
		...config,
		users: users.map((user) => ({
			...user,
			aliases: user.aliases.filter((a) => !targets.includes(normalizeProjectName(a))),
		})),
	}
}

export function removeUser(config: RepoConfig, gid: string): RepoConfig {
	return { ...config, users: (config.users ?? []).filter((user) => user.gid !== gid) }
}

/**
 * Resolve a GID, alias, email, or display name to one registered user. Matching is
 * case-insensitive and tiered in that order, so an explicitly registered alias wins over
 * another user's display name. Throws when the deciding tier matches more than one user.
 */
export function resolveUser(config: RepoConfig, query: string): RepoUserEntry | null {
	const users = config.users ?? []
	const normalized = normalizeProjectName(query)
	const tiers: Array<(user: RepoUserEntry) => boolean> = [
		(user) => user.gid === query.trim(),
		(user) => user.aliases.some((alias) => normalizeProjectName(alias) === normalized),
		(user) => user.email !== undefined && normalizeProjectName(user.email) === normalized,
		(user) => normalizeProjectName(user.name) === normalized,
	]
	for (const matches of tiers) {
		const found = users.filter(matches)
		if (found.length === 1) return found[0] as RepoUserEntry
		if (found.length > 1) {
			const candidates = found.map((user) => `${user.gid} (${user.name})`).join(', ')
			throw new Error(
				`"${query}" matches ${found.length} registered users: ${candidates}. Use an alias or GID instead.`,
			)
		}
	}
	return null
}

export function observeUser(
	config: RepoConfig,
	observation: UserObservation,
): { updated: boolean; config: RepoConfig } {
	const users = config.users ?? []
	const index = users.findIndex((user) => user.gid === observation.gid)
	const existing = users[index]
	if (!existing || (existing.name === observation.name && existing.email === observation.email)) {
		return { updated: false, config }
	}
	const next = users.slice()
	next[index] = {
		gid: existing.gid,
		name: observation.name,
		...(observation.email !== undefined && { email: observation.email }),
		aliases: existing.aliases,
	}
	return { updated: true, config: { ...config, users: next } }
}

/**
 * Turn an `--assignee` value into something Asana accepts. A numeric GID or `me` passes
 * through untouched; anything else is looked up in the repo user registry (no API call).
 */
export async function resolveAssignee(
	value: string,
	opts?: { configPath?: string; startDir?: string },
): Promise<string> {
	const trimmed = value.trim()
	if (/^\d+$/.test(trimmed) || trimmed === 'me') {
		return trimmed
	}
	const path = opts?.configPath ?? (await findConfigFile(opts?.startDir ?? process.cwd()))
	const hint = `Register them with: cyber-asana config add-user --search "${value}" --alias <alias>`
	if (!path || !(await pathExists(path))) {
		throw new Error(`Assignee "${value}" is not a user GID and no repo config was found. ${hint}`)
	}
	const user = resolveUser(await loadRepoConfig(path), trimmed)
	if (!user) {
		throw new Error(`Assignee "${value}" is not registered in ${path}. ${hint}`)
	}
	return user.gid
}

export async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path)
		return true
	} catch {
		return false
	}
}

export async function defaultConfigPath(startDir = process.cwd(), explicitPath?: string): Promise<string> {
	const override = explicitPath ?? process.env.CYBER_ASANA_CONFIG
	if (override) {
		return isAbsolute(override) ? override : resolve(startDir, override)
	}

	let current = resolve(startDir)
	for (;;) {
		if (await pathExists(join(current, '.git'))) {
			return join(current, DEFAULT_CONFIG_RELATIVE_PATH)
		}
		const parent = dirname(current)
		if (parent === current) {
			return join(current, DEFAULT_CONFIG_RELATIVE_PATH)
		}
		current = parent
	}
}

export async function resolveConfigPath(startDir = process.cwd(), explicitPath?: string): Promise<string | null> {
	const override = explicitPath ?? process.env.CYBER_ASANA_CONFIG
	if (override) {
		return isAbsolute(override) ? override : resolve(startDir, override)
	}
	return findConfigFile(startDir)
}

export async function findConfigFile(startDir = process.cwd(), explicitPath?: string): Promise<string | null> {
	const override = explicitPath ?? process.env.CYBER_ASANA_CONFIG
	if (override) {
		const resolved = isAbsolute(override) ? override : resolve(startDir, override)
		return (await pathExists(resolved)) ? resolved : null
	}

	let current = resolve(startDir)
	for (;;) {
		const candidate = join(current, DEFAULT_CONFIG_RELATIVE_PATH)
		if (await pathExists(candidate)) {
			return candidate
		}
		const gitDir = join(current, '.git')
		if (await pathExists(gitDir)) {
			return null
		}
		const parent = dirname(current)
		if (parent === current) {
			return null
		}
		current = parent
	}
}

export async function loadRepoConfig(path: string): Promise<RepoConfig> {
	const raw = JSON.parse(await readFile(path, 'utf8'))
	return parseRepoConfig(raw)
}

export async function saveRepoConfig(path: string, config: RepoConfig): Promise<void> {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

export async function tryObserveProjectFromConfigPath(path: string, observation: ProjectObservation): Promise<boolean> {
	const config = await loadRepoConfig(path)
	const result = observeProject(config, observation)
	if (!result.updated) {
		return false
	}
	await saveRepoConfig(path, result.config)
	return true
}

export async function observeProjectIfConfigured(
	observation: ProjectObservation,
	opts?: { configPath?: string; startDir?: string },
): Promise<boolean> {
	const path = opts?.configPath ?? (await findConfigFile(opts?.startDir ?? process.cwd()))
	if (!path) {
		return false
	}
	return tryObserveProjectFromConfigPath(path, observation)
}

export function projectObservationFromApi(data: { gid?: string; name?: string }): ProjectObservation | null {
	if (typeof data.gid !== 'string' || typeof data.name !== 'string') {
		return null
	}
	return { gid: data.gid, name: data.name }
}
