import { Command, InvalidArgumentError } from 'commander'
import { addGidOption, requiredGid } from './cli-options.js'
import {
	loadEffectiveProjects,
	loadEffectiveUsers,
	resolveEffectiveProject,
	resolveEffectiveUser,
} from './effective-config.js'
import {
	addGlobalProject,
	addGlobalUser,
	createEmptyGlobalConfig,
	findGlobalRepoEntry,
	type GlobalConfig,
	globalConfigPath,
	loadGlobalConfig,
	observeGlobalProject,
	observeGlobalUser,
	removeGlobalAliases,
	removeGlobalProject,
	removeGlobalUser,
	resolveGlobalProject,
	resolveGlobalUser,
	resolveRepoKey,
	saveGlobalConfig,
} from './global-config.js'
import { output, printFields, printNextSteps, printTable } from './output.js'
import type { ProjectApi } from './projects/api.js'
import {
	addProject,
	addUser,
	createEmptyRepoConfig,
	defaultConfigPath,
	loadRepoConfig,
	normalizeProjectName,
	observeProject,
	observeUser,
	pathExists,
	type RepoConfig,
	type RepoProjectEntry,
	type RepoUserEntry,
	removeAliases,
	removeProject,
	removeUser,
	resolveConfigPath,
	resolveProject,
	resolveUser,
	saveRepoConfig,
	type UserObservation,
} from './repo-config.js'
import type { SearchApi } from './search/api.js'
import type { UserApi } from './users/api.js'

type ConfigCliOptions = {
	config?: string
}

type GlobalFlags = {
	global?: boolean
	merged?: boolean
	repo?: string
}

function assertGlobalMergedExclusive(opts: GlobalFlags) {
	if (opts.global && opts.merged) {
		throw new InvalidArgumentError('Pass --global or --merged, not both')
	}
}

async function resolveRepoKeyOrThrow(repoOverride?: string): Promise<string> {
	const repo = await resolveRepoKey(process.cwd(), repoOverride)
	if (!repo) {
		throw new Error('Cannot determine a repo for --global; pass --repo <key>')
	}
	return repo
}

async function loadGlobalConfigOrEmpty(path: string): Promise<{ path: string; config: GlobalConfig }> {
	try {
		return { path, config: await loadGlobalConfig(path) }
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return { path, config: createEmptyGlobalConfig() }
		}
		throw error
	}
}

async function resolveWritableGlobalConfig(): Promise<{ path: string; config: GlobalConfig }> {
	return loadGlobalConfigOrEmpty(globalConfigPath())
}

async function requireGlobalConfig(): Promise<{ path: string; config: GlobalConfig }> {
	const path = globalConfigPath()
	if (!(await pathExists(path))) {
		throw new Error('Global config not found')
	}
	return { path, config: await loadGlobalConfig(path) }
}

function printProjectTable(projects: RepoProjectEntry[]) {
	printTable(
		projects,
		[
			{ label: 'GID', get: (p: RepoProjectEntry) => p.gid },
			{ label: 'Name', get: (p: RepoProjectEntry) => p.name },
		],
		{ entity: 'registered projects' },
	)
}

async function showGlobalProjects(opts: GlobalFlags) {
	const repo = await resolveRepoKeyOrThrow(opts.repo)
	const { path, config } = await requireGlobalConfig()
	const projects = findGlobalRepoEntry(config, repo)?.projects ?? []
	output({ path, repo, projects }, () => {
		console.log(path)
		console.log(`Repo: ${repo}`)
		printProjectTable(projects)
	})
}

async function showMergedProjects(opts: ConfigCliOptions & GlobalFlags) {
	const effective = await loadEffectiveProjects({ configPath: configPathFromOpts(opts), repo: opts.repo })
	if (effective.localPath === null && effective.projects.length === 0) {
		throw new Error('No repo or global config found')
	}
	output(effective, () => {
		console.log(effective.localPath ?? '(no repo config found)')
		console.log(effective.globalPath)
		if (effective.repo) console.log(`Repo: ${effective.repo}`)
		printProjectTable(effective.projects)
	})
}

async function resolveProjectGlobal(name: string, opts: GlobalFlags) {
	const repo = await resolveRepoKeyOrThrow(opts.repo)
	const { config } = await requireGlobalConfig()
	const project = resolveGlobalProject(config, repo, { name })
	if (!project) {
		throw new Error(`Project not found in global config: ${name}`)
	}
	output(project, () => printFields({ Name: project.name, GID: project.gid }))
}

async function resolveProjectMerged(name: string, opts: ConfigCliOptions & GlobalFlags) {
	const effective = await loadEffectiveProjects({ configPath: configPathFromOpts(opts), repo: opts.repo })
	const project = resolveEffectiveProject(effective, { name })
	if (!project) {
		throw new Error(`Project not found in merged config: ${name}`)
	}
	output(project, () => printFields({ Name: project.name, GID: project.gid }))
}

function splitAliases(value: string): string[] {
	return value
		.split(',')
		.map((alias) => alias.trim())
		.filter((alias) => alias.length > 0)
}

/** Accept `--alias a,b` as well as a repeated `--alias`; blank pieces are dropped. */
function collectAliases(value: string, previous: string[]) {
	return [...previous, ...splitAliases(value)]
}

function configPathFromOpts(opts: ConfigCliOptions): string | undefined {
	return opts.config
}

async function loadConfigOrEmpty(path: string): Promise<{ path: string; config: RepoConfig }> {
	try {
		return { path, config: await loadRepoConfig(path) }
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
			return { path, config: createEmptyRepoConfig() }
		}
		throw error
	}
}

async function resolveWritableConfig(opts: ConfigCliOptions): Promise<{ path: string; config: RepoConfig }> {
	const path = await defaultConfigPath(process.cwd(), configPathFromOpts(opts))
	return loadConfigOrEmpty(path)
}

function projectNameFromApi(data: { name?: string }): string {
	if (typeof data.name !== 'string' || data.name.length === 0) {
		throw new Error('Project response is missing name')
	}
	return data.name
}

function userObservationFromApi(gid: string, data: { name?: string; email?: string }): UserObservation {
	if (typeof data.name !== 'string' || data.name.length === 0) {
		throw new Error('User response is missing name')
	}
	return { gid, name: data.name, ...(typeof data.email === 'string' && data.email.length > 0 && { email: data.email }) }
}

async function loadExistingConfig(opts: ConfigCliOptions): Promise<{ path: string; config: RepoConfig }> {
	const path = await resolveConfigPath(process.cwd(), configPathFromOpts(opts))
	if (!path) {
		throw new Error('Repo config not found')
	}
	return { path, config: await loadRepoConfig(path) }
}

function printUserTable(users: RepoUserEntry[]) {
	printTable(
		users,
		[
			{ label: 'GID', get: (u) => u.gid },
			{ label: 'Name', get: (u) => u.name },
			{ label: 'Email', get: (u) => u.email ?? '' },
			{ label: 'Aliases', get: (u) => u.aliases.join(', ') },
		],
		{ entity: 'registered users' },
	)
}

type UserHit = { gid: string; name?: string; email?: string }

/**
 * Turn a typeahead query into one user GID. Typeahead is fuzzy, so a single hit is taken, an
 * exact name or email match breaks a tie, and anything else is refused rather than guessed.
 */
async function searchUserGid(getSearch: (() => SearchApi) | undefined, workspaceGid: string, query: string) {
	if (!getSearch) {
		throw new Error('Search API is not available')
	}
	const hits = (await getSearch().searchObjects(workspaceGid, 'user', {
		query,
		optFields: 'gid,name,email',
	})) as UserHit[]
	if (hits.length === 0) {
		throw new Error(`No user matches "${query}" in workspace ${workspaceGid}`)
	}
	if (hits.length === 1) return (hits[0] as UserHit).gid
	const normalized = normalizeProjectName(query)
	const exact = hits.filter(
		(hit) =>
			(hit.name !== undefined && normalizeProjectName(hit.name) === normalized) ||
			(hit.email !== undefined && normalizeProjectName(hit.email) === normalized),
	)
	if (exact.length === 1) return (exact[0] as UserHit).gid
	const candidates = hits.map((hit) => `  ${hit.gid} (${[hit.name, hit.email].filter(Boolean).join(', ')})`).join('\n')
	throw new Error(
		`"${query}" matches ${hits.length} users:\n${candidates}\nRe-run with one of them: cyber-asana config add-user <user-gid>`,
	)
}

export function configCommand(getProjects: () => ProjectApi, getUsers?: () => UserApi, getSearch?: () => SearchApi) {
	const cmd = new Command('config').description(
		'Manage repo-local Asana project and user registry (.agents/cyber-asana.json)',
	)

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana config show',
			'  cyber-asana config path',
			'  cyber-asana config add <project-gid>',
			'  cyber-asana config resolve-project "My Project"',
			'  cyber-asana config remove <gid-or-name>',
			'  cyber-asana config add-user <user-gid> --alias <alias>',
			'  cyber-asana config add-user --search "ada@example.com" --alias ada',
			'  cyber-asana config remove-alias <alias>[,<alias>...]',
			'  cyber-asana config resolve-user <alias-email-or-name>',
			'  cyber-asana config list-users',
			'  cyber-asana config sync',
			'  cyber-asana config add <project-gid> --global   # personal registry, this repo',
			'  cyber-asana config show --merged                # repo config + global, unioned',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	cmd
		.command('show')
		.description('Show the repo config')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Read the global registry (a repo/project registry outside any repo) instead')
		.option('--repo <key>', 'Repo key for --global/--merged (default: auto-detected from the git remote)')
		.option('--merged', 'Union the repo config with the global registry entry for this repo')
		.action(async (opts: ConfigCliOptions & GlobalFlags) => {
			assertGlobalMergedExclusive(opts)
			if (opts.global) return showGlobalProjects(opts)
			if (opts.merged) return showMergedProjects(opts)
			const path = await resolveConfigPath(process.cwd(), configPathFromOpts(opts))
			if (!path) {
				throw new Error('Repo config not found')
			}
			const config = await loadRepoConfig(path)
			output({ path, ...config }, () => {
				console.log(path)
				printTable(
					config.projects,
					[
						{ label: 'GID', get: (p) => p.gid },
						{ label: 'Name', get: (p) => p.name },
					],
					{ entity: 'registered projects' },
				)
				if (config.users) printUserTable(config.users)
			})
		})

	cmd
		.command('list')
		.description('List projects in the repo config (alias for show)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Read the global registry (a repo/project registry outside any repo) instead')
		.option('--repo <key>', 'Repo key for --global/--merged (default: auto-detected from the git remote)')
		.option('--merged', 'Union the repo config with the global registry entry for this repo')
		.action(async (opts: ConfigCliOptions & GlobalFlags) => {
			assertGlobalMergedExclusive(opts)
			if (opts.global) return showGlobalProjects(opts)
			if (opts.merged) return showMergedProjects(opts)
			const path = await resolveConfigPath(process.cwd(), configPathFromOpts(opts))
			if (!path) {
				throw new Error('Repo config not found')
			}
			const config = await loadRepoConfig(path)
			output({ path, ...config }, () => {
				console.log(path)
				printTable(
					config.projects,
					[
						{ label: 'GID', get: (p) => p.gid },
						{ label: 'Name', get: (p) => p.name },
					],
					{ entity: 'registered projects' },
				)
			})
		})

	cmd
		.command('path')
		.description('Print the resolved config file path')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Print the global registry path instead')
		.action(async (opts: ConfigCliOptions & { global?: boolean }) => {
			if (opts.global) {
				output({ path: globalConfigPath() }, () => {
					console.log(globalConfigPath())
				})
				return
			}
			const path = await resolveConfigPath(process.cwd(), configPathFromOpts(opts))
			output({ path }, () => {
				console.log(path ?? '')
			})
		})

	cmd
		.command('resolve-project <name>')
		.description('Resolve a project name to GID from the repo config (no API call)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Resolve from the global registry instead')
		.option('--repo <key>', 'Repo key for --global/--merged (default: auto-detected from the git remote)')
		.option('--merged', 'Resolve against the repo config unioned with the global registry entry for this repo')
		.action(async (name: string, opts: ConfigCliOptions & GlobalFlags) => {
			assertGlobalMergedExclusive(opts)
			if (opts.global) return resolveProjectGlobal(name, opts)
			if (opts.merged) return resolveProjectMerged(name, opts)
			const path = await resolveConfigPath(process.cwd(), configPathFromOpts(opts))
			if (!path) {
				throw new Error('Repo config not found')
			}
			const config = await loadRepoConfig(path)
			const project = resolveProject(config, { name })
			if (!project) {
				throw new Error(`Project not found in repo config: ${name}`)
			}
			output(project, () =>
				printFields({
					Name: project.name,
					GID: project.gid,
				}),
			)
		})

	cmd
		.command('add <project-gid>')
		.description('Add or update a project entry (fetches name from Asana)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Add to the global registry entry for this repo instead')
		.option('--repo <key>', 'Repo key for --global (default: auto-detected from the git remote)')
		.action(async (projectGid: string, opts: ConfigCliOptions & GlobalFlags) => {
			if (opts.global) {
				const repo = await resolveRepoKeyOrThrow(opts.repo)
				const api = getProjects()
				const project = await api.getProject(projectGid)
				const entry: RepoProjectEntry = { gid: projectGid, name: projectNameFromApi(project) }
				const { path, config } = await resolveWritableGlobalConfig()
				const next = addGlobalProject(config, repo, entry)
				await saveGlobalConfig(path, next)
				output({ path, repo, project: entry }, () =>
					printFields({
						Path: path,
						Repo: repo,
						Name: entry.name,
						GID: entry.gid,
					}),
				)
				return
			}
			const api = getProjects()
			const project = await api.getProject(projectGid)
			const entry: RepoProjectEntry = { gid: projectGid, name: projectNameFromApi(project) }
			const { path, config } = await resolveWritableConfig(opts)
			const next = addProject(config, entry)
			await saveRepoConfig(path, next)
			output({ path, project: entry }, () =>
				printFields({
					Path: path,
					Name: entry.name,
					GID: entry.gid,
				}),
			)
		})

	cmd
		.command('remove <gid-or-name>')
		.description('Remove a project entry by GID or name')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Remove from the global registry entry for this repo instead')
		.option('--repo <key>', 'Repo key for --global (default: auto-detected from the git remote)')
		.action(async (gidOrName: string, opts: ConfigCliOptions & GlobalFlags) => {
			if (opts.global) {
				const repo = await resolveRepoKeyOrThrow(opts.repo)
				const { path, config } = await resolveWritableGlobalConfig()
				const next = /^\d+$/.test(gidOrName)
					? removeGlobalProject(config, repo, { gid: gidOrName })
					: removeGlobalProject(config, repo, { name: gidOrName })
				const before = findGlobalRepoEntry(config, repo)?.projects.length ?? 0
				const after = findGlobalRepoEntry(next, repo)?.projects.length ?? 0
				if (after === before) {
					throw new Error(`Project not found in global config: ${gidOrName}`)
				}
				await saveGlobalConfig(path, next)
				output({ path, repo, removed: gidOrName }, () => {
					console.log(`Removed ${gidOrName} from ${path} (repo: ${repo})`)
				})
				return
			}
			const { path, config } = await resolveWritableConfig(opts)
			const next = /^\d+$/.test(gidOrName)
				? removeProject(config, { gid: gidOrName })
				: removeProject(config, { name: gidOrName })
			if (next.projects.length === config.projects.length) {
				throw new Error(`Project not found in repo config: ${gidOrName}`)
			}
			await saveRepoConfig(path, next)
			output({ path, removed: gidOrName }, () => {
				console.log(`Removed ${gidOrName} from ${path}`)
			})
		})

	cmd
		.command('sync')
		.description('Refresh all project names and user names/emails from Asana')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Refresh the global registry instead')
		.option('--repo <key>', 'Scope --global to one repo (default: every repo in the global registry)')
		.action(async (opts: ConfigCliOptions & GlobalFlags) => {
			if (opts.global) {
				const { path, config } = await requireGlobalConfig()
				const api = getProjects()
				let updated = 0
				let configToSave = config
				const targetRepos = opts.repo ? config.repos.filter((r) => r.repo === opts.repo) : config.repos
				for (const repoEntry of targetRepos) {
					for (const entry of repoEntry.projects) {
						const project = await api.getProject(entry.gid)
						const observation = { repo: repoEntry.repo, gid: entry.gid, name: projectNameFromApi(project) }
						const result = observeGlobalProject(configToSave, observation)
						if (result.updated) {
							updated += 1
							configToSave = result.config
						}
					}
				}
				let usersUpdated = 0
				const registeredGlobalUsers = configToSave.users ?? []
				if (getUsers && registeredGlobalUsers.length > 0) {
					const users = getUsers()
					for (const entry of registeredGlobalUsers) {
						const result = observeGlobalUser(
							configToSave,
							userObservationFromApi(entry.gid, await users.getUser(entry.gid)),
						)
						if (result.updated) {
							usersUpdated += 1
							configToSave = result.config
						}
					}
				}
				if (updated > 0 || usersUpdated > 0) {
					await saveGlobalConfig(path, configToSave)
				}
				const totalProjects = configToSave.repos.reduce((sum, r) => sum + r.projects.length, 0)
				output(
					{ path, updated, users_updated: usersUpdated, repos: configToSave.repos, users: configToSave.users },
					() => {
						console.log(
							`Synced ${totalProjects} project(s) across ${configToSave.repos.length} repo(s); ${updated} name(s) updated`,
						)
						if (configToSave.users) {
							console.log(`Synced ${configToSave.users.length} user(s); ${usersUpdated} updated`)
						}
					},
				)
				return
			}
			const path = await resolveConfigPath(process.cwd(), configPathFromOpts(opts))
			if (!path) {
				throw new Error('Repo config not found')
			}
			const config = await loadRepoConfig(path)
			const api = getProjects()
			let updated = 0
			let configToSave = config
			for (const entry of config.projects) {
				const project = await api.getProject(entry.gid)
				const observation = { gid: entry.gid, name: projectNameFromApi(project) }
				const result = observeProject(configToSave, observation)
				if (result.updated) {
					updated += 1
					configToSave = result.config
				}
			}
			let usersUpdated = 0
			const registeredUsers = configToSave.users ?? []
			if (getUsers && registeredUsers.length > 0) {
				const users = getUsers()
				for (const entry of registeredUsers) {
					const result = observeUser(configToSave, userObservationFromApi(entry.gid, await users.getUser(entry.gid)))
					if (result.updated) {
						usersUpdated += 1
						configToSave = result.config
					}
				}
			}
			if (updated > 0 || usersUpdated > 0) {
				await saveRepoConfig(path, configToSave)
			}
			const payload = {
				path,
				updated,
				projects: configToSave.projects,
				...(configToSave.users && { users_updated: usersUpdated, users: configToSave.users }),
			}
			output(payload, () => {
				console.log(`Synced ${configToSave.projects.length} project(s); ${updated} name(s) updated`)
				if (configToSave.users) {
					console.log(`Synced ${configToSave.users.length} user(s); ${usersUpdated} updated`)
				}
			})
		})

	addGidOption(
		cmd
			.command('add-user [user-gid]')
			.description('Add or update a user entry (fetches name and email from Asana)')
			.option('--search <query>', 'Find the user by name or email (typeahead) instead of passing a GID')
			.option('--alias <alias>', 'Alias to resolve to this user (repeatable or comma-separated)', collectAliases, [])
			.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
			.option(
				'--global',
				'Add to the global registry’s flat user list instead (no --repo — a person is not repo-scoped)',
			),
		'workspace',
		'Workspace GID for --search',
		{ env: 'ASANA_WORKSPACE', legacyAlias: false },
	).action(
		async (
			gidArg: string | undefined,
			opts: ConfigCliOptions &
				GlobalFlags & { alias: string[]; search?: string; workspace?: string; workspaceGid?: string },
		) => {
			if (!getUsers) {
				throw new Error('User API is not available')
			}
			if (gidArg && opts.search) {
				throw new InvalidArgumentError('Pass a <user-gid> or --search <query>, not both')
			}
			if (!gidArg && !opts.search) {
				throw new InvalidArgumentError('Pass a <user-gid> or --search <query>')
			}
			const userGid =
				gidArg ??
				(await searchUserGid(getSearch, requiredGid(opts, 'workspace', 'Workspace GID'), opts.search as string))
			const observation = userObservationFromApi(userGid, await getUsers().getUser(userGid))
			if (opts.global) {
				const { path, config } = await resolveWritableGlobalConfig()
				const next = addGlobalUser(config, { ...observation, aliases: opts.alias })
				await saveGlobalConfig(path, next)
				const user = next.users?.find((u) => u.gid === userGid) as RepoUserEntry
				output({ path, user }, () => {
					printFields({
						Path: path,
						Name: user.name,
						GID: user.gid,
						Email: user.email ?? null,
						Aliases: user.aliases.join(', '),
					})
					printNextSteps([`cyber-asana task create <name> --assignee ${user.aliases[0] ?? user.gid} — assign work`])
				})
				return
			}
			const { path, config } = await resolveWritableConfig(opts)
			const next = addUser(config, { ...observation, aliases: opts.alias })
			await saveRepoConfig(path, next)
			const user = next.users?.find((u) => u.gid === userGid) as RepoUserEntry
			output({ path, user }, () => {
				printFields({
					Path: path,
					Name: user.name,
					GID: user.gid,
					Email: user.email ?? null,
					Aliases: user.aliases.join(', '),
				})
				printNextSteps([`cyber-asana task create <name> --assignee ${user.aliases[0] ?? user.gid} — assign work`])
			})
		},
	)

	cmd
		.command('resolve-user <query>')
		.description('Resolve a user alias, email, or name to GID from the repo config (no API call)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Resolve from the global registry’s flat user list instead')
		.option('--merged', 'Resolve the repo config first, falling back to the global registry (staged, not merged)')
		.action(async (query: string, opts: ConfigCliOptions & GlobalFlags) => {
			assertGlobalMergedExclusive(opts)
			if (opts.global) {
				const { config } = await requireGlobalConfig()
				const user = resolveGlobalUser(config, query)
				if (!user) {
					throw new Error(`User not found in global config: ${query}`)
				}
				output(user, () =>
					printFields({ Name: user.name, GID: user.gid, Email: user.email ?? null, Aliases: user.aliases.join(', ') }),
				)
				return
			}
			if (opts.merged) {
				const user = await resolveEffectiveUser(query, { configPath: configPathFromOpts(opts) })
				if (!user) {
					throw new Error(`User not found in merged config: ${query}`)
				}
				output(user, () =>
					printFields({ Name: user.name, GID: user.gid, Email: user.email ?? null, Aliases: user.aliases.join(', ') }),
				)
				return
			}
			const { config } = await loadExistingConfig(opts)
			const user = resolveUser(config, query)
			if (!user) {
				throw new Error(`User not found in repo config: ${query}`)
			}
			output(user, () =>
				printFields({
					Name: user.name,
					GID: user.gid,
					Email: user.email ?? null,
					Aliases: user.aliases.join(', '),
				}),
			)
		})

	cmd
		.command('list-users')
		.description('List users in the repo config')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'List the global registry’s flat user list instead')
		.option('--merged', 'Union the repo config’s users with the global registry’s')
		.action(async (opts: ConfigCliOptions & GlobalFlags) => {
			assertGlobalMergedExclusive(opts)
			if (opts.global) {
				const { path, config } = await requireGlobalConfig()
				const users = config.users ?? []
				output({ path, users }, () => {
					console.log(path)
					printUserTable(users)
				})
				return
			}
			if (opts.merged) {
				const effective = await loadEffectiveUsers({ configPath: configPathFromOpts(opts) })
				if (effective.localPath === null && effective.users.length === 0) {
					throw new Error('No repo or global config found')
				}
				output(effective, () => {
					console.log(effective.localPath ?? '(no repo config found)')
					console.log(effective.globalPath)
					printUserTable(effective.users)
				})
				return
			}
			const { path, config } = await loadExistingConfig(opts)
			const users = config.users ?? []
			output({ path, users }, () => {
				console.log(path)
				printUserTable(users)
			})
		})

	cmd
		.command('remove-alias <alias...>')
		.description('Remove aliases from whichever registered users own them (comma-separated or several)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Remove from the global registry’s flat user list instead')
		.action(async (values: string[], opts: ConfigCliOptions & GlobalFlags) => {
			const aliases = values.flatMap(splitAliases)
			if (aliases.length === 0) {
				throw new InvalidArgumentError('Pass at least one alias to remove')
			}
			if (opts.global) {
				const { path, config } = await resolveWritableGlobalConfig()
				const next = removeGlobalAliases(config, aliases)
				await saveGlobalConfig(path, next)
				output({ path, removed: aliases, users: next.users ?? [] }, () => {
					console.log(`Removed alias(es) ${aliases.join(', ')} from ${path}`)
				})
				return
			}
			const { path, config } = await loadExistingConfig(opts)
			const next = removeAliases(config, aliases)
			await saveRepoConfig(path, next)
			output({ path, removed: aliases, users: next.users ?? [] }, () => {
				console.log(`Removed alias(es) ${aliases.join(', ')} from ${path}`)
			})
		})

	cmd
		.command('remove-user <query>')
		.description('Remove a user entry by GID, alias, email, or name')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.option('--global', 'Remove from the global registry’s flat user list instead')
		.action(async (query: string, opts: ConfigCliOptions & GlobalFlags) => {
			if (opts.global) {
				const { path, config } = await resolveWritableGlobalConfig()
				const user = resolveGlobalUser(config, query)
				if (!user) {
					throw new Error(`User not found in global config: ${query}`)
				}
				await saveGlobalConfig(path, removeGlobalUser(config, user.gid))
				output({ path, removed: user.gid }, () => {
					console.log(`Removed ${user.name} (${user.gid}) from ${path}`)
				})
				return
			}
			const { path, config } = await resolveWritableConfig(opts)
			const user = resolveUser(config, query)
			if (!user) {
				throw new Error(`User not found in repo config: ${query}`)
			}
			await saveRepoConfig(path, removeUser(config, user.gid))
			output({ path, removed: user.gid }, () => {
				console.log(`Removed ${user.name} (${user.gid}) from ${path}`)
			})
		})

	return cmd
}
