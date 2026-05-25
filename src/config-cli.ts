import { Command } from 'commander'
import { output, printFields, printTable } from './output.js'
import type { ProjectApi } from './projects/api.js'
import {
	addProject,
	createEmptyRepoConfig,
	defaultConfigPath,
	loadRepoConfig,
	observeProject,
	type RepoConfig,
	type RepoProjectEntry,
	removeProject,
	resolveConfigPath,
	resolveProject,
	saveRepoConfig,
} from './repo-config.js'

type ConfigCliOptions = {
	config?: string
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

export function configCommand(getProjects: () => ProjectApi) {
	const cmd = new Command('config').description('Manage repo-local Asana project registry (.agents/cyber-asana.json)')

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
				printTable(config.projects, [
					{ label: 'GID', get: (p) => p.gid },
					{ label: 'Name', get: (p) => p.name },
				])
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
		.description('Refresh all project names from Asana')
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
			if (updated > 0) {
				await saveRepoConfig(path, configToSave)
			}
			output({ path, updated, projects: configToSave.projects }, () => {
				console.log(`Synced ${configToSave.projects.length} project(s); ${updated} name(s) updated`)
			})
		})

	return cmd
}
