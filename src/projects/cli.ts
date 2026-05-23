import { Command } from 'commander'
import { createProject, deleteProject, getProject, listProjects, updateProject } from './api.js'

export function projectCommand() {
	const cmd = new Command('project').description('Manage Asana projects')

	cmd
		.command('list')
		.description('List projects in a workspace')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.action(async (opts: { workspace: string }) => {
			console.log(JSON.stringify(await listProjects(opts.workspace), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a project by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getProject(gid), null, 2))
		})

	cmd
		.command('create <name>')
		.description('Create a new project')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.option('--notes <text>', 'Project notes')
		.option('--color <color>', 'Project color')
		.action(async (name: string, opts: { workspace: string; notes?: string; color?: string }) => {
			console.log(
				JSON.stringify(await createProject(opts.workspace, name, { notes: opts.notes, color: opts.color }), null, 2),
			)
		})

	cmd
		.command('update <gid>')
		.description('Update a project')
		.option('--name <name>', 'New name')
		.option('--notes <text>', 'New notes')
		.option('--color <color>', 'New color')
		.action(async (gid: string, opts: { name?: string; notes?: string; color?: string }) => {
			console.log(JSON.stringify(await updateProject(gid, opts), null, 2))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a project')
		.action(async (gid: string) => {
			await deleteProject(gid)
			console.log(`Deleted project ${gid}`)
		})

	return cmd
}
