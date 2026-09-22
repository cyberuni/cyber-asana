import { Command } from 'commander'
import { output, printFields, printNextSteps, printTable } from './output.js'
import type { ProjectApi } from './projects/api.js'
import {
	addProject,
	addUser,
	createEmptyRepoConfig,
	defaultConfigPath,
	loadRepoConfig,
	observeProject,
	observeUser,
	type RepoConfig,
	type RepoProjectEntry,
	type RepoUserEntry,
	removeProject,
	removeUser,
	resolveConfigPath,
	resolveProject,
	resolveUser,
	saveRepoConfig,
	type UserObservation,
} from './repo-config.js'
import type { UserApi } from './users/api.js'

type ConfigCliOptions = {
	config?: string
}

function collectOption(value: string, previous: string[]) {
	return [...previous, value]
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

export function configCommand(getProjects: () => ProjectApi, getUsers?: () => UserApi) {
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
			'  cyber-asana config resolve-user <alias-email-or-name>',
			'  cyber-asana config list-users',
			'  cyber-asana config sync',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	cmd
		.command('show')
		.description('Show the repo config')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (opts: ConfigCliOptions) => {
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
		.action(async (opts: ConfigCliOptions) => {
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
		.action(async (opts: ConfigCliOptions) => {
			const path = await resolveConfigPath(process.cwd(), configPathFromOpts(opts))
			output({ path }, () => {
				console.log(path ?? '')
			})
		})

	cmd
		.command('resolve-project <name>')
		.description('Resolve a project name to GID from the repo config (no API call)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (name: string, opts: ConfigCliOptions) => {
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
		.action(async (projectGid: string, opts: ConfigCliOptions) => {
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
		.action(async (gidOrName: string, opts: ConfigCliOptions) => {
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
		.action(async (opts: ConfigCliOptions) => {
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

	cmd
		.command('add-user <user-gid>')
		.description('Add or update a user entry (fetches name and email from Asana)')
		.option('--alias <alias>', 'Alias to resolve to this user (repeatable)', collectOption, [])
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (userGid: string, opts: ConfigCliOptions & { alias: string[] }) => {
			if (!getUsers) {
				throw new Error('User API is not available')
			}
			const observation = userObservationFromApi(userGid, await getUsers().getUser(userGid))
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
		})

	cmd
		.command('resolve-user <query>')
		.description('Resolve a user alias, email, or name to GID from the repo config (no API call)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (query: string, opts: ConfigCliOptions) => {
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
		.action(async (opts: ConfigCliOptions) => {
			const { path, config } = await loadExistingConfig(opts)
			const users = config.users ?? []
			output({ path, users }, () => {
				console.log(path)
				printUserTable(users)
			})
		})

	cmd
		.command('remove-user <query>')
		.description('Remove a user entry by GID, alias, email, or name')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (query: string, opts: ConfigCliOptions) => {
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
