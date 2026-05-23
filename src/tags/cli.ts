import { Command } from 'commander'
import { createTag, getTag, listTags } from './api.js'

export function tagCommand() {
	const cmd = new Command('tag').description('Manage Asana tags')

	cmd
		.command('list')
		.description('List tags in a workspace')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.action(async (opts: { workspace: string }) => {
			console.log(JSON.stringify(await listTags(opts.workspace), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a tag by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getTag(gid), null, 2))
		})

	cmd
		.command('create <name>')
		.description('Create a tag')
		.requiredOption('--workspace <gid>', 'Workspace GID')
		.action(async (name: string, opts: { workspace: string }) => {
			console.log(JSON.stringify(await createTag(opts.workspace, name), null, 2))
		})

	return cmd
}
