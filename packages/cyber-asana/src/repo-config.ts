import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export const DEFAULT_CONFIG_RELATIVE_PATH = join('.agents', 'cyber-asana.json')

export type RepoProjectEntry = {
	gid: string
	name: string
}

export type RepoUserEntry = {
	gid: string
	name: string
	email?: string
	aliases: string[]
}

export type RepoConfig = {
	schema_version: 1
	projects: RepoProjectEntry[]
	users?: RepoUserEntry[]
}

export type ProjectObservation = {
	gid: string
	name: string
}

export function createEmptyRepoConfig(): RepoConfig {
	return { schema_version: 1, projects: [] }
}

export function normalizeProjectName(name: string): string {
	return name.trim().toLowerCase()
}

export function parseRepoConfig(raw: unknown): RepoConfig {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Repo config must be a JSON object')
	}
	const record = raw as Record<string, unknown>
	if (record.schema_version !== 1) {
		throw new Error('Unsupported or missing schema_version; expected 1')
	}
	const projects = parseProjectEntries(record.projects, 'projects')
	if (record.users === undefined) {
		return { schema_version: 1, projects }
	}
	if (!Array.isArray(record.users)) {
		throw new Error('Repo config users must be an array')
	}
	const users = record.users.map((entry, index) => parseUserEntry(entry, index))
	return { schema_version: 1, projects, users }
}

/** Parse a `{ gid, name }[]` array, shared by the repo config and the global registry's per-repo lists. */
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
		return { gid: project.gid, name: project.name }
	})
}

function parseUserEntry(entry: unknown, index: number): RepoUserEntry {
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

export function resolveProject(config: RepoConfig, query: { name?: string; gid?: string }): RepoProjectEntry | null {
	if (query.gid) {
		return config.projects.find((project) => project.gid === query.gid) ?? null
	}
	if (query.name) {
		const normalized = normalizeProjectName(query.name)
		return config.projects.find((project) => normalizeProjectName(project.name) === normalized) ?? null
	}
	return null
}

export function observeProject(
	config: RepoConfig,
	observation: ProjectObservation,
): { updated: boolean; config: RepoConfig } {
	const index = config.projects.findIndex((project) => project.gid === observation.gid)
	if (index === -1) {
		return { updated: false, config }
	}
	const existing = config.projects[index]
	if (!existing || existing.name === observation.name) {
		return { updated: false, config }
	}
	const projects = config.projects.slice()
	projects[index] = { gid: observation.gid, name: observation.name }
	return { updated: true, config: { ...config, projects } }
}

export function addProject(config: RepoConfig, entry: RepoProjectEntry): RepoConfig {
	const index = config.projects.findIndex((project) => project.gid === entry.gid)
	if (index === -1) {
		return { ...config, projects: [...config.projects, entry] }
	}
	const projects = config.projects.slice()
	projects[index] = entry
	return { ...config, projects }
}

export function removeProject(config: RepoConfig, query: { gid?: string; name?: string }): RepoConfig {
	if (query.gid) {
		return { ...config, projects: config.projects.filter((project) => project.gid !== query.gid) }
	}
	if (query.name) {
		const normalized = normalizeProjectName(query.name)
		return {
			...config,
			projects: config.projects.filter((project) => normalizeProjectName(project.name) !== normalized),
		}
	}
	return config
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
