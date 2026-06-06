import { Command } from 'commander'
import { output, printFields } from './output.js'
import { parseAsanaUrl } from './url.js'

export function urlCommand() {
	const cmd = new Command('url').description('Parse Asana app URLs into GIDs (no API calls)')

	cmd
		.command('parse <url>')
		.description('Extract workspace, project, task, and list-view GIDs from an Asana URL')
		.action((url: string) => {
			const data = parseAsanaUrl(url)
			output(data, () =>
				printFields({
					Kind: data.kind,
					'Workspace GID': data.workspace_gid,
					'Project GID': data.project_gid,
					'Task GID': data.task_gid,
					'List view GID': data.list_view_gid,
				}),
			)
		})

	return cmd
}
