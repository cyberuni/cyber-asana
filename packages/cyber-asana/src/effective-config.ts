import {
	findGlobalRepoEntry,
	globalConfigPath,
	loadGlobalConfig,
	resolveGlobalUser,
	resolveRepoKey,
} from './global-config.js'
import {
	loadRepoConfig,
	pathExists,
	type RepoProjectEntry,
	type RepoUserEntry,
	resolveConfigPath,
	resolveProject,
	resolveUser,
} from './repo-config.js'

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

export type EffectiveUsers = {
	localPath: string | null
	globalPath: string
	users: RepoUserEntry[]
}

/** Union two user lists by `gid`; `local` always wins a `gid` also present in `global`. */
export function mergeUserEntries(local: RepoUserEntry[], global: RepoUserEntry[]): RepoUserEntry[] {
	const localGids = new Set(local.map((user) => user.gid))
	return [...local, ...global.filter((user) => !localGids.has(user.gid))]
}

/**
 * Load the repo config's users and the global registry's flat users, and union them
 * (`mergeUserEntries`). This is a *listing* view — resolving one query against it can raise a
 * cross-scope ambiguity that neither registry has on its own (see `resolveEffectiveUser` for the
 * staged alternative used by `--assignee`).
 */
export async function loadEffectiveUsers(opts?: { configPath?: string; startDir?: string }): Promise<EffectiveUsers> {
	const startDir = opts?.startDir ?? process.cwd()

	const foundLocalPath = await resolveConfigPath(startDir, opts?.configPath)
	const localExists = foundLocalPath !== null && (await pathExists(foundLocalPath))
	const local = localExists ? await loadRepoConfig(foundLocalPath as string) : null

	const globalPath = globalConfigPath(startDir)
	const globalConfig = (await pathExists(globalPath)) ? await loadGlobalConfig(globalPath) : null

	return {
		localPath: localExists ? foundLocalPath : null,
		globalPath,
		users: mergeUserEntries(local?.users ?? [], globalConfig?.users ?? []),
	}
}

export function resolveEffectiveUsersQuery(effective: EffectiveUsers, query: string): RepoUserEntry | null {
	return resolveUser({ schema_version: 1, projects: [], users: effective.users }, query)
}

/**
 * Resolve one user by query, **staged, not merged**: the repo config's own registry is tried to
 * completion first — including its own ambiguous-match error — and the global registry is opened
 * only on a clean miss (no repo config, or no match in it). This is what keeps an alias that is
 * unambiguous within each scope on its own from becoming a manufactured cross-scope collision; for
 * a listing that should show a genuine cross-scope collision, use `loadEffectiveUsers` instead.
 */
export async function resolveEffectiveUser(
	query: string,
	opts?: { configPath?: string; startDir?: string },
): Promise<RepoUserEntry | null> {
	const startDir = opts?.startDir ?? process.cwd()

	const localPath = await resolveConfigPath(startDir, opts?.configPath)
	if (localPath && (await pathExists(localPath))) {
		const user = resolveUser(await loadRepoConfig(localPath), query)
		if (user) return user
	}

	// Global users are flat (no repo key), so there is no repo-resolvability gate here — unlike
	// projects, a missing/unresolvable repo never excludes the global user list from consideration.
	const globalPath = globalConfigPath(startDir)
	if (await pathExists(globalPath)) {
		return resolveGlobalUser(await loadGlobalConfig(globalPath), query)
	}
	return null
}

/**
 * Turn an `--assignee` value into something Asana accepts: a numeric GID or `me` passes through
 * untouched; anything else is resolved via `resolveEffectiveUser` (repo config first, global
 * fallback — see its own doc comment for why that's staged rather than merged).
 */
export async function resolveEffectiveAssignee(
	value: string,
	opts?: { configPath?: string; startDir?: string },
): Promise<string> {
	const trimmed = value.trim()
	if (/^\d+$/.test(trimmed) || trimmed === 'me') {
		return trimmed
	}
	const user = await resolveEffectiveUser(trimmed, opts)
	if (!user) {
		throw new Error(
			`Assignee "${value}" is not registered locally or globally. Register them with: cyber-asana config add-user --search "${value}" --alias <alias> (add --global for the personal registry).`,
		)
	}
	return user.gid
}
