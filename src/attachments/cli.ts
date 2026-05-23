import { Command } from 'commander'
import { output, printFields, printTable } from '../output.js'
import { getAttachment, listAttachments } from './api.js'

type Attachment = { gid: string; name: string; resource_type?: string; download_url?: string | null }

export function attachmentCommand() {
	const cmd = new Command('attachment').description('Manage Asana attachments')

	cmd
		.command('list')
		.description('List attachments for a task')
		.requiredOption('--task <gid>', 'Task GID')
		.action(async (opts: { task: string }) => {
			const data = await listAttachments(opts.task)
			output(data, () =>
				printTable(data, [
					{ label: 'Name', get: (a: Attachment) => a.name },
					{ label: 'ID', get: (a: Attachment) => a.gid },
				]),
			)
		})

	cmd
		.command('get <gid>')
		.description('Get an attachment by GID')
		.action(async (gid: string) => {
			const data = await getAttachment(gid)
			output(data, () =>
				printFields({
					Name: (data as Attachment).name,
					ID: (data as Attachment).gid,
					URL: (data as Attachment).download_url ?? null,
				}),
			)
		})

	return cmd
}
