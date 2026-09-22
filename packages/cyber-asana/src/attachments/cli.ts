import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	type CliGidOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
} from '../cli-options.js'
import { deleteIdempotently, deleteMessage } from '../idempotent-delete.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../output.js'
import type { AttachmentApi } from './api.js'
import { createAttachment, deleteAttachment, getAttachment, listAttachments } from './api.js'

type Attachment = { gid: string; name: string; resource_type?: string; download_url?: string | null }

function resolveAttachmentApi(api?: AttachmentApi | (() => AttachmentApi)): AttachmentApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listAttachments,
			getAttachment,
			createAttachment,
			deleteAttachment,
		}
	)
}

// An attachment hangs off a task, a project, or a project brief. `--task-gid`
// predates the other two, so it stays a working alias for `--parent-gid`.
function requiredParentGid(opts: CliGidOptions) {
	const gid = normalizedGid(opts, 'parent') ?? normalizedGid(opts, 'task')
	if (!gid) throw new InvalidArgumentError('Parent GID (task, project, or project brief) is required')
	return gid
}

// Minimal default schema for attachment lists — principle 2. The download URL
// is signed and long, so a list omits it; `attachment get <gid>` returns it.
const ATTACHMENT_LIST_FIELDS = 'gid,name,resource_type'

export function attachmentCommand(api?: AttachmentApi | (() => AttachmentApi)) {
	const cmd = new Command('attachment').description('Manage Asana attachments')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana attachment list --parent-gid <gid>',
			'  cyber-asana attachment get <gid> --toon',
			'  cyber-asana attachment create ./sprint.md --parent-gid <task-gid>',
			'  cyber-asana attachment create --url https://example.com/design --parent-gid <task-gid> --name "Design doc"',
			'  cyber-asana attachment delete <gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(
			addGidOption(
				cmd.command('list').description('List attachments for a task, project, or project brief'),
				'parent',
				'Parent GID — a task, project, or project brief',
			),
			'task',
			'Task GID',
		),
	).action(async (opts: CliGidOptions & { limit?: number; offset?: string; optFields?: string }) => {
		const pagination = paginationOptionsFromCli(opts)
		pagination.optFields ??= ATTACHMENT_LIST_FIELDS
		const data = await resolveAttachmentApi(api).listAttachments(requiredParentGid(opts), pagination)
		output(data, () => {
			const items = itemsForOutput(data)
			printTable(
				items,
				[
					{ label: 'Name', get: (a: Attachment) => a.name },
					{ label: 'ID', get: (a: Attachment) => a.gid },
				],
				{ entity: 'attachments' },
			)
			printCountSummary(items.length, 'attachment(s)')
			printNextPageHint(data)
			printNextSteps(['cyber-asana attachment get <gid> — view an attachment and its download URL'])
		})
	})

	addReadOptions(cmd.command('get <gid>').description('Get an attachment by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveAttachmentApi(api).getAttachment(gid, readOptionsFromCli(opts))
			output(data, () =>
				printFields({
					Name: (data as Attachment).name,
					ID: (data as Attachment).gid,
					URL: (data as Attachment).download_url ?? null,
				}),
			)
		},
	)

	addGidOption(
		cmd
			.command('create [file]')
			.description('Attach a local file or an external URL to a task, project, or project brief')
			.option('--url <url>', 'Attach an external URL instead of a local file')
			.option('--name <name>', 'Attachment name (default: the file basename, or the URL)')
			.option('--connect-to-app', 'Connect this app to the external attachment (--url only; requires an OAuth token)'),
		'parent',
		'Parent GID — a task, project, or project brief',
	).action(
		async (file: string | undefined, opts: CliGidOptions & { url?: string; name?: string; connectToApp?: boolean }) => {
			const data = await resolveAttachmentApi(api).createAttachment(requiredParentGid(opts), {
				file,
				url: opts.url,
				name: opts.name,
				...(opts.connectToApp !== undefined && { connectToApp: opts.connectToApp }),
			})
			output(data, () => printFields({ Name: (data as Attachment).name, ID: (data as Attachment).gid }))
		},
	)

	cmd
		.command('delete <gid>')
		.description('Delete an attachment')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('attachment', gid, () => resolveAttachmentApi(api).deleteAttachment(gid))
			output(result, () => console.log(deleteMessage(result, 'Attachment')))
		})

	return cmd
}
