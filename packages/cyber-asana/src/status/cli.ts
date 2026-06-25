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
import type { StatusApi } from './api.js'
import { createStatus, deleteStatus, getStatus, listStatuses } from './api.js'

type Status = { gid: string; status_type?: string; title?: string; text?: string; created_at?: string }

function fmtStatus(s: Status) {
	printFields({
		ID: s.gid,
		Type: s.status_type ?? null,
		Title: s.title ?? null,
		At: s.created_at ?? null,
		Text: s.text ?? null,
	})
}

function resolveStatusApi(api?: StatusApi | (() => StatusApi)): StatusApi {
	if (typeof api === 'function') return api()
	return api ?? { listStatuses, getStatus, createStatus, deleteStatus }
}

export function statusCommand(api?: StatusApi | (() => StatusApi)) {
	const cmd = new Command('status').description('Manage Asana status updates on projects, portfolios, and goals')

	addPaginationOptions(
		addGidOption(
			cmd.command('list').description('List status updates for a project, portfolio, or goal'),
			'parent',
			'Parent GID (project, portfolio, or goal)',
		),
	).action(
		async (opts: { parent?: string; parentGid?: string; limit?: number; offset?: string; optFields?: string }) => {
			const data = await resolveStatusApi(api).listStatuses(
				requiredGid(opts, 'parent', 'Parent GID'),
				paginationOptionsFromCli(opts),
			)
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'ID', get: (s: Status) => s.gid },
					{ label: 'Type', get: (s: Status) => s.status_type ?? '' },
					{ label: 'Title', get: (s: Status) => s.title ?? '' },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a status update by GID')
		.action(async (gid: string) => {
			const data = await resolveStatusApi(api).getStatus(gid)
			output(data, () => fmtStatus(data))
		})

	addGidOption(
		cmd
			.command('create')
			.description('Create a status update on a project, portfolio, or goal')
			.requiredOption('--status-type <type>', 'Status type (e.g. on_track, at_risk, off_track, on_hold, complete)')
			.option('--text <text>', 'Status update body as plain text')
			.option('--html-text <html>', 'Status update body as Asana rich text HTML')
			.option('--title <title>', 'Status update title'),
		'parent',
		'Parent GID (project, portfolio, or goal)',
	).action(
		async (opts: {
			parent?: string
			parentGid?: string
			statusType: string
			text?: string
			htmlText?: string
			title?: string
		}) => {
			const data = await resolveStatusApi(api).createStatus(requiredGid(opts, 'parent', 'Parent GID'), {
				status_type: opts.statusType,
				...(opts.text !== undefined && { text: opts.text }),
				...(opts.htmlText !== undefined && { html_text: opts.htmlText }),
				...(opts.title !== undefined && { title: opts.title }),
			})
			output(data, () => fmtStatus(data))
		},
	)

	cmd
		.command('delete <gid>')
		.description('Delete a status update')
		.action(async (gid: string) => {
			await resolveStatusApi(api).deleteStatus(gid)
			console.log(`Deleted status update ${gid}`)
		})

	return cmd
}
