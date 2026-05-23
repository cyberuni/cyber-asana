import { Command } from 'commander'
import { output, printFields, printTable } from '../output.js'
import { getWorkspace, listWorkspaces } from './api.js'

type Workspace = { gid: string; name: string }

export function workspaceCommand() {
	const cmd = new Command('workspace').description('Manage Asana workspaces')

	cmd
		.command('list')
		.description('List all workspaces')
		.action(async () => {
			const data = await listWorkspaces()
			output(data, () =>
				printTable(data, [
					{ label: 'Name', get: (w: Workspace) => w.name },
					{ label: 'ID', get: (w: Workspace) => w.gid },
				]),
			)
		})

	cmd
		.command('get <gid>')
		.description('Get a workspace by GID')
		.action(async (gid: string) => {
			const data = await getWorkspace(gid)
			output(data, () => printFields({ Name: (data as Workspace).name, ID: (data as Workspace).gid }))
		})

	return cmd
}
