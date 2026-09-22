import { findGlobalRepoEntry, globalConfigPath, loadGlobalConfig, resolveRepoKey } from './global-config.js'
import { loadRepoConfig, pathExists, type RepoProjectEntry, resolveConfigPath, resolveProject } from './repo-config.js'

export type EffectiveProjects = {
	localPath: string | null
	globalPath: string
	repo: string | null
	projects: RepoProjectEntry[]
}

/** Union two project lists by `gid`; `local` always wins a `gid` also present in `global`. */
export function mergeProjectEntries(local: RepoProjectEntry[], global: RepoProjectEntry[]): RepoProjectEntry[] {
	const localGids = new Set(local.map((project) => project.gid))
	return [...local, ...global.filter((project) => !localGids.has(project.gid))]
}

/**
 * Load the repo config's projects and the global registry's projects for the current (or
 * explicit) repo key, and union them (`mergeProjectEntries`). Never throws for an absent source —
 * an absent repo config, an absent global file, or an unresolvable repo key all just contribute no
 * projects; the caller decides whether an empty result is an error.
 */
export async function loadEffectiveProjects(opts?: {
	configPath?: string
	repo?: string
	startDir?: string
}): Promise<EffectiveProjects> {
	const startDir = opts?.startDir ?? process.cwd()

	const foundLocalPath = await resolveConfigPath(startDir, opts?.configPath)
	const localExists = foundLocalPath !== null && (await pathExists(foundLocalPath))
	const local = localExists ? await loadRepoConfig(foundLocalPath as string) : null

	const globalPath = globalConfigPath(startDir)
	const repo = opts?.repo ?? (await resolveRepoKey(startDir))
	let globalProjects: RepoProjectEntry[] = []
	if (repo !== null && (await pathExists(globalPath))) {
		const globalConfig = await loadGlobalConfig(globalPath)
		globalProjects = findGlobalRepoEntry(globalConfig, repo)?.projects ?? []
	}

	return {
		localPath: localExists ? foundLocalPath : null,
		globalPath,
		repo,
		projects: mergeProjectEntries(local?.projects ?? [], globalProjects),
	}
}

export function resolveEffectiveProject(
	effective: EffectiveProjects,
	query: { name?: string; gid?: string },
): RepoProjectEntry | null {
	return resolveProject({ schema_version: 1, projects: effective.projects }, query)
}
