import { loadEffectiveProjects, loadEffectiveScopes } from './effective-config.js'
import {
	addGlobalScope,
	createEmptyGlobalConfig,
	type GlobalConfig,
	globalConfigPath,
	loadGlobalConfig,
	removeGlobalScope,
	resolveRepoKey,
	saveGlobalConfig,
} from './global-config.js'
import {
	addScope,
	createEmptyRepoConfig,
	defaultConfigPath,
	loadRepoConfig,
	type ProjectFields,
	pathExists,
	removeScope,
	saveRepoConfig,
} from './repo-config.js'
import { normalizeScopeName, type ScopeEntry } from './scopes.js'

export type ScopeSource = 'repo' | 'global'

export type ScopeStoreOptions = {
	/** An explicit repo config file, as `--config` or `CYBER_ASANA_CONFIG` give. */
	configPath?: string
	/** An explicit key for the global registry's repo entry, as `--repo` gives. */
	repo?: string
	startDir?: string
}

export type LoadedScopes = {
	/** Repo and global scopes merged; the repo wins a name clash. */
	scopes: ScopeEntry[]
	/** Where each scope came from, keyed by its lower-cased name. */
	sources: Record<string, ScopeSource>
	/** The registered project marked `default`, which stands in for a scope when none is configured. */
	defaultProject?: { gid: string; name: string }
	/** The field roles each registered project maps, keyed by project GID. */
	fields?: Record<string, ProjectFields>
}

/** The scope configuration as the scrum API sees it: read both sources, write to one. */
export type ScopeStore = {
	load(): Promise<LoadedScopes>
	add(entry: ScopeEntry, target: ScopeSource): Promise<{ path: string; target: ScopeSource }>
	/** Remove from `target`, or from the repo config when it has the scope and the global registry otherwise. */
	remove(name: string, target?: ScopeSource): Promise<{ path: string; target: ScopeSource }>
}

async function loadRepoOrEmpty(path: string) {
	return (await pathExists(path)) ? loadRepoConfig(path) : createEmptyRepoConfig()
}

async function loadGlobalOrEmpty(path: string): Promise<GlobalConfig> {
	return (await pathExists(path)) ? loadGlobalConfig(path) : createEmptyGlobalConfig()
}

export function createFileScopeStore(opts: ScopeStoreOptions = {}): ScopeStore {
	const startDir = opts.startDir ?? process.cwd()

	async function globalTarget() {
		const repo = await resolveRepoKey(startDir, opts.repo)
		if (repo === null) {
			throw new Error('Cannot tell which repo this is (no .git found); pass --repo <key> to name it')
		}
		return { repo, path: globalConfigPath(startDir) }
	}

	return {
		async load() {
			const effective = await loadEffectiveScopes({ ...opts, startDir })
			const sources: Record<string, ScopeSource> = {}
			for (const scope of effective.scopes) {
				const key = normalizeScopeName(scope.name)
				sources[key] = effective.fromRepo.some((s) => normalizeScopeName(s.name) === key) ? 'repo' : 'global'
			}
			const projects = (await loadEffectiveProjects({ ...opts, startDir })).projects
			const marked = projects.find((project) => project.default)
			return {
				scopes: effective.scopes,
				sources,
				...(marked && { defaultProject: { gid: marked.gid, name: marked.name } }),
				fields: Object.fromEntries(projects.filter((p) => p.fields).map((p) => [p.gid, p.fields as ProjectFields])),
			}
		},

		async add(entry, target) {
			if (target === 'repo') {
				const path = await defaultConfigPath(startDir, opts.configPath)
				await saveRepoConfig(path, addScope(await loadRepoOrEmpty(path), entry))
				return { path, target }
			}
			const { repo, path } = await globalTarget()
			await saveGlobalConfig(path, addGlobalScope(await loadGlobalOrEmpty(path), repo, entry))
			return { path, target }
		},

		async remove(name, target) {
			const key = normalizeScopeName(name)
			const effective = await loadEffectiveScopes({ ...opts, startDir })
			const has = (list: ScopeEntry[]) => list.some((scope) => normalizeScopeName(scope.name) === key)
			const from = target ?? (has(effective.fromRepo) ? 'repo' : has(effective.fromGlobal) ? 'global' : undefined)
			if (from === undefined) {
				const known = effective.scopes.map((scope) => scope.name).join(', ') || '(none)'
				throw new Error(`Scope "${name}" is not configured; known scopes: ${known}`)
			}
			if (from === 'repo') {
				const path = await defaultConfigPath(startDir, opts.configPath)
				await saveRepoConfig(path, removeScope(await loadRepoOrEmpty(path), name))
				return { path, target: from }
			}
			const { repo, path } = await globalTarget()
			await saveGlobalConfig(path, removeGlobalScope(await loadGlobalOrEmpty(path), repo, name))
			return { path, target: from }
		},
	}
}
