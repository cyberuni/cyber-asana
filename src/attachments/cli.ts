import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	requiredGid,
} from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import { getAttachment, listAttachments } from './api.js'

type Attachment = { gid: string; name: string; resource_type?: string; download_url?: string | null }

export function attachmentCommand() {
	const cmd = new Command('attachment').description('Manage Asana attachments')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List attachments for a task'), 'task', 'Task GID'),
	).action(async (opts: { task?: string; taskGid?: string; limit?: number; offset?: string; optFields?: string }) => {
		const data = await listAttachments(requiredGid(opts, 'task', 'Task GID'), paginationOptionsFromCli(opts))
		output(data, () => {
			printTable(itemsForOutput(data), [
				{ label: 'Name', get: (a: Attachment) => a.name },
				{ label: 'ID', get: (a: Attachment) => a.gid },
			])
			printNextPageHint(data)
		})
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
