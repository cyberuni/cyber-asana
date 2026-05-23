import { Command } from 'commander'
import { getWorkspace, listWorkspaces } from './api.js'

export function workspaceCommand() {
	const cmd = new Command('workspace').description('Manage Asana workspaces')

	cmd
		.command('list')
		.description('List all workspaces')
		.action(async () => {
			console.log(JSON.stringify(await listWorkspaces(), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a workspace by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getWorkspace(gid), null, 2))
		})

	return cmd
}
