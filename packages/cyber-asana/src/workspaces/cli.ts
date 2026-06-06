import { Command } from 'commander'
import { addPaginationOptions, itemsForOutput, paginationOptionsFromCli, printNextPageHint } from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import type { WorkspaceApi } from './api.js'
import { getWorkspace, listWorkspaces } from './api.js'

type Workspace = { gid: string; name: string }

function resolveWorkspaceApi(api?: WorkspaceApi | (() => WorkspaceApi)): WorkspaceApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listWorkspaces,
			getWorkspace,
		}
	)
}

export function workspaceCommand(api?: WorkspaceApi | (() => WorkspaceApi)) {
	const cmd = new Command('workspace').description('Manage Asana workspaces')

	addPaginationOptions(cmd.command('list').description('List all workspaces')).action(
		async (opts: { limit?: number; offset?: string; optFields?: string }) => {
			const data = await resolveWorkspaceApi(api).listWorkspaces(paginationOptionsFromCli(opts))
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (w: Workspace) => w.name },
					{ label: 'ID', get: (w: Workspace) => w.gid },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a workspace by GID')
		.action(async (gid: string) => {
			const data = await resolveWorkspaceApi(api).getWorkspace(gid)
			output(data, () => printFields({ Name: (data as Workspace).name, ID: (data as Workspace).gid }))
		})

	return cmd
}
