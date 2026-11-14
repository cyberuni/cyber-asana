import type { ScopeSource, ScopeStore, ScopeStoreOptions } from '../config/scope-store.js'
import type { ScopeEntry } from '../config/scopes.js'
import type { ScrumPolicy } from './policy.js'
import {
	applyScopeOverrides,
	collectScopeTasks,
	resolveScopeProjects,
	type ScopeGateways,
	selectScope,
} from './scope.js'

export type ScrumApiDeps = {
	/** Opens the scope configuration; each call may name its own config file or repo key. */
	store: (opts?: ScopeStoreOptions) => ScopeStore
	gateways: ScopeGateways
	loadPolicy: () => Promise<ScrumPolicy>
}

export type ScrumApi = ReturnType<typeof createScrumApi>

export type ScopeListing = {
	scopes: Array<ScopeEntry & { source: ScopeSource }>
	/** The scope a command would use when none is configured: the repo's default project. */
	implicit?: ScopeEntry
}

export function createScrumApi(deps: ScrumApiDeps) {
	return {
		async listScopes(opts?: ScopeStoreOptions): Promise<ScopeListing> {
			const loaded = await deps.store(opts).load()
			const scopes = loaded.scopes.map((scope) => ({
				...scope,
				source: loaded.sources[scope.name.trim().toLowerCase()] ?? 'repo',
			}))
			if (scopes.length > 0 || !loaded.defaultProject) return { scopes }
			return { scopes, implicit: selectScope([], { defaultProject: loaded.defaultProject }).scope }
		},

		async addScope(scope: ScopeEntry, opts?: ScopeStoreOptions & { global?: boolean }) {
			const { path, target } = await deps.store(opts).add(scope, opts?.global ? 'global' : 'repo')
			return { scope, path, target }
		},

		/** Removing a scope that is not configured succeeds with `already_absent: true` and writes nothing. */
		async removeScope(name: string, opts?: ScopeStoreOptions & { global?: boolean }) {
			const store = deps.store(opts)
			const key = name.trim().toLowerCase()
			if (!(await store.load()).scopes.some((scope) => scope.name.trim().toLowerCase() === key)) {
				return { removed: name, already_absent: true as const }
			}
			const { path, target } = await store.remove(name, opts?.global ? 'global' : undefined)
			return { removed: name, already_absent: false as const, path, target }
		},

		/**
		 * Pick a scope (`--scope`, else the default, else the repo's default project), list the projects
		 * it covers, and lay its sprint overrides over the policy. `tasks` also returns the scope's tasks,
		 * each counted once however many of its projects it is in.
		 */
		async resolveScope(input: { scope?: string; tasks?: boolean; taskFields?: string }, opts?: ScopeStoreOptions) {
			const loaded = await deps.store(opts).load()
			const { scope, implicit } = selectScope(loaded.scopes, {
				...(input.scope !== undefined && { name: input.scope }),
				...(loaded.defaultProject && { defaultProject: loaded.defaultProject }),
			})
			const projects = await resolveScopeProjects(scope, deps.gateways)
			const sprint = applyScopeOverrides(await deps.loadPolicy(), scope)
			const tasks = input.tasks
				? await collectScopeTasks(
						projects.map((project) => project.gid),
						deps.gateways,
						input.taskFields ? { optFields: input.taskFields } : undefined,
					)
				: undefined
			return { scope, implicit, projects, sprint, ...(tasks && { tasks }) }
		},
	}
}
