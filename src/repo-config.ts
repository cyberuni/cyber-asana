import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, resolve } from 'node:path'

export const DEFAULT_CONFIG_RELATIVE_PATH = join('.agents', 'cyber-asana.json')

export type RepoProjectEntry = {
	gid: string
	name: string
}

export type RepoConfig = {
	schema_version: 1
	projects: RepoProjectEntry[]
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
	if (!Array.isArray(record.projects)) {
		throw new Error('Repo config projects must be an array')
	}
	const projects = record.projects.map((entry, index) => {
		if (!entry || typeof entry !== 'object') {
			throw new Error(`projects[${index}] must be an object`)
		}
		const project = entry as Record<string, unknown>
		if (typeof project.gid !== 'string' || project.gid.length === 0) {
			throw new Error(`projects[${index}].gid must be a non-empty string`)
		}
		if (typeof project.name !== 'string' || project.name.length === 0) {
			throw new Error(`projects[${index}].name must be a non-empty string`)
		}
		return { gid: project.gid, name: project.name }
	})
	return { schema_version: 1, projects }
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

async function pathExists(path: string): Promise<boolean> {
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
