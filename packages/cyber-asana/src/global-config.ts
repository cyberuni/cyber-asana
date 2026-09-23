import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import {
	addProject,
	addUser,
	observeUser,
	parseProjectEntries,
	parseUserEntry,
	pathExists,
	type RepoProjectEntry,
	type RepoUserEntry,
	removeAliases,
	removeProject,
	removeUser,
	resolveProject,
	resolveUser,
	type UserObservation,
} from './repo-config.js'

const GLOBAL_CONFIG_DIR_NAME = 'cyber-asana'
const GLOBAL_CONFIG_FILE_NAME = 'config.json'

export type GlobalRepoEntry = {
	repo: string
	projects: RepoProjectEntry[]
}

export type GlobalConfig = {
	schema_version: 1
	repos: GlobalRepoEntry[]
	/** Flat, unlike `repos` — a person's identity doesn't change with which repo you're in. */
	users?: RepoUserEntry[]
}

export function createEmptyGlobalConfig(): GlobalConfig {
	return { schema_version: 1, repos: [] }
}

export function parseGlobalConfig(raw: unknown): GlobalConfig {
	if (!raw || typeof raw !== 'object') {
		throw new Error('Global config must be a JSON object')
	}
	const record = raw as Record<string, unknown>
	if (record.schema_version !== 1) {
		throw new Error('Unsupported or missing schema_version; expected 1')
	}
	if (!Array.isArray(record.repos)) {
		throw new Error('Global config repos must be an array')
	}
	const repos = record.repos.map((entry, index) => {
		if (!entry || typeof entry !== 'object') {
			throw new Error(`repos[${index}] must be an object`)
		}
		const repoEntry = entry as Record<string, unknown>
		if (typeof repoEntry.repo !== 'string' || repoEntry.repo.length === 0) {
			throw new Error(`repos[${index}].repo must be a non-empty string`)
		}
		return { repo: repoEntry.repo, projects: parseProjectEntries(repoEntry.projects, `repos[${index}].projects`) }
	})
	if (record.users === undefined) {
		return { schema_version: 1, repos }
	}
	if (!Array.isArray(record.users)) {
		throw new Error('Global config users must be an array')
	}
	const users = record.users.map((entry, index) => parseUserEntry(entry, index))
	return { schema_version: 1, repos, users }
}

/** Where the global registry lives: `CYBER_ASANA_GLOBAL_CONFIG`, else `$XDG_CONFIG_HOME`/`~/.config` + the fixed relative path. Never searched for — this is a single fixed file, not a per-repo one. */
export function globalConfigPath(startDir = process.cwd()): string {
	const override = process.env.CYBER_ASANA_GLOBAL_CONFIG
	if (override) {
		return isAbsolute(override) ? override : resolve(startDir, override)
	}
	const configDir = process.env.XDG_CONFIG_HOME || join(homedir(), '.config')
	return join(configDir, GLOBAL_CONFIG_DIR_NAME, GLOBAL_CONFIG_FILE_NAME)
}

export async function loadGlobalConfig(path: string): Promise<GlobalConfig> {
	const raw = JSON.parse(await readFile(path, 'utf8'))
	return parseGlobalConfig(raw)
}

export async function saveGlobalConfig(path: string, config: GlobalConfig): Promise<void> {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
}

async function findGitRoot(startDir: string): Promise<string | null> {
	let current = resolve(startDir)
	for (;;) {
		if (await pathExists(join(current, '.git'))) {
			return current
		}
		const parent = dirname(current)
		if (parent === current) {
			return null
		}
		current = parent
	}
}

function extractOriginUrl(gitConfigText: string): string | null {
	let inOrigin = false
	for (const rawLine of gitConfigText.split(/\r?\n/)) {
		const line = rawLine.trim()
		const section = line.match(/^\[([^\]]+)\]$/)
		if (section) {
			inOrigin = section[1].replace(/\s+/g, ' ').toLowerCase() === 'remote "origin"'
			continue
		}
		if (!inOrigin) continue
		const url = line.match(/^url\s*=\s*(.+)$/)
		if (url) return (url[1] as string).trim()
	}
	return null
}

/**
 * Normalize a git remote URL to a stable, host-first key: strip the scheme, any
 * userinfo, scp-like `host:path` syntax becomes `host/path`, and a trailing
 * `.git`/`/` is dropped. Lowercased so casing differences across clones don't
 * split one repo into two registry entries.
 */
export function normalizeRepoUrl(url: string): string {
	let value = url.trim()
	value = value.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, '')
	value = value.replace(/^[^@/]+@/, '')
	const colonIndex = value.indexOf(':')
	const slashIndex = value.indexOf('/')
	if (colonIndex !== -1 && (slashIndex === -1 || colonIndex < slashIndex)) {
		value = `${value.slice(0, colonIndex)}/${value.slice(colonIndex + 1)}`
	}
	value = value.replace(/\.git\/?$/, '')
	value = value.replace(/\/+$/, '')
	return value.toLowerCase()
}

/**
 * Resolve the global registry's key for the current repository: an explicit
 * `--repo` wins outright; otherwise the nearest `.git` root's `origin` remote,
 * normalized, or that root's absolute path when there is no remote; or nothing
 * when no `.git` is found at all, at which point the caller must pass `--repo`.
 */
export async function resolveRepoKey(startDir = process.cwd(), explicitRepo?: string): Promise<string | null> {
	if (explicitRepo) return explicitRepo
	const gitRoot = await findGitRoot(startDir)
	if (!gitRoot) return null
	const configPath = join(gitRoot, '.git', 'config')
	if (!(await pathExists(configPath))) return gitRoot
	const originUrl = extractOriginUrl(await readFile(configPath, 'utf8'))
	return originUrl ? normalizeRepoUrl(originUrl) : gitRoot
}

export function findGlobalRepoEntry(config: GlobalConfig, repo: string): GlobalRepoEntry | null {
	return config.repos.find((entry) => entry.repo === repo) ?? null
}

export function resolveGlobalProject(
	config: GlobalConfig,
	repo: string,
	query: { name?: string; gid?: string },
): RepoProjectEntry | null {
	const entry = findGlobalRepoEntry(config, repo)
	if (!entry) return null
	return resolveProject({ schema_version: 1, projects: entry.projects }, query)
}

export function addGlobalProject(config: GlobalConfig, repo: string, entry: RepoProjectEntry): GlobalConfig {
	const index = config.repos.findIndex((r) => r.repo === repo)
	if (index === -1) {
		return { ...config, repos: [...config.repos, { repo, projects: [entry] }] }
	}
	const existing = config.repos[index] as GlobalRepoEntry
	const projects = addProject({ schema_version: 1, projects: existing.projects }, entry).projects
	const repos = config.repos.slice()
	repos[index] = { repo, projects }
	return { ...config, repos }
}

export function removeGlobalProject(
	config: GlobalConfig,
	repo: string,
	query: { gid?: string; name?: string },
): GlobalConfig {
	const index = config.repos.findIndex((r) => r.repo === repo)
	if (index === -1) return config
	const existing = config.repos[index] as GlobalRepoEntry
	const projects = removeProject({ schema_version: 1, projects: existing.projects }, query).projects
	const repos = config.repos.slice()
	repos[index] = { repo, projects }
	return { ...config, repos }
}

export type GlobalProjectObservation = {
	repo: string
	gid: string
	name: string
}

/** Refresh one repo's one project entry in place; used by `config sync --global` across every repo in the file. */
export function observeGlobalProject(
	config: GlobalConfig,
	observation: GlobalProjectObservation,
): { updated: boolean; config: GlobalConfig } {
	const index = config.repos.findIndex((r) => r.repo === observation.repo)
	if (index === -1) return { updated: false, config }
	const existing = config.repos[index] as GlobalRepoEntry
	const projectIndex = existing.projects.findIndex((p) => p.gid === observation.gid)
	const project = existing.projects[projectIndex]
	if (!project || project.name === observation.name) return { updated: false, config }
	const projects = existing.projects.slice()
	projects[projectIndex] = { gid: observation.gid, name: observation.name }
	const repos = config.repos.slice()
	repos[index] = { repo: observation.repo, projects }
	return { updated: true, config: { ...config, repos } }
}

/**
 * Users are a flat top-level list, unlike `repos` — no repo key is involved at all. Every
 * function below delegates to repo-config.ts's own user-registry logic (case-insensitive
 * matching, alias-uniqueness, ambiguous-match detection) via a synthetic `RepoConfig` with an
 * empty `projects`, so the matching rules never drift between the two registries.
 */
function asRepoConfig(users: RepoUserEntry[]) {
	return { schema_version: 1 as const, projects: [], users }
}

export function addGlobalUser(config: GlobalConfig, entry: RepoUserEntry): GlobalConfig {
	const result = addUser(asRepoConfig(config.users ?? []), entry)
	return { ...config, users: result.users }
}

export function removeGlobalUser(config: GlobalConfig, gid: string): GlobalConfig {
	const result = removeUser(asRepoConfig(config.users ?? []), gid)
	return { ...config, users: result.users }
}

export function removeGlobalAliases(config: GlobalConfig, aliases: string[]): GlobalConfig {
	const result = removeAliases(asRepoConfig(config.users ?? []), aliases)
	return { ...config, users: result.users }
}

export function resolveGlobalUser(config: GlobalConfig, query: string): RepoUserEntry | null {
	return resolveUser(asRepoConfig(config.users ?? []), query)
}

export function observeGlobalUser(
	config: GlobalConfig,
	observation: UserObservation,
): { updated: boolean; config: GlobalConfig } {
	const result = observeUser(asRepoConfig(config.users ?? []), observation)
	if (!result.updated) return { updated: false, config }
	return { updated: true, config: { ...config, users: result.config.users } }
}
