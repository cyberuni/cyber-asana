import { Command } from 'commander'
import { getAttachment, listAttachments } from './api.js'

export function attachmentCommand() {
	const cmd = new Command('attachment').description('Manage Asana attachments')

	cmd
		.command('list')
		.description('List attachments for a task')
		.requiredOption('--task <gid>', 'Task GID')
		.action(async (opts: { task: string }) => {
			console.log(JSON.stringify(await listAttachments(opts.task), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get an attachment by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getAttachment(gid), null, 2))
		})

	return cmd
}
