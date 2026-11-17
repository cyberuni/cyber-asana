import { Command } from 'commander'
import { addGidOption, addReadOptions, readOptionsFromCli, requiredGid } from '../platform/cli/options.js'
import { output, printFields, printNextSteps } from '../platform/cli/output.js'
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import { isFull, truncate } from '../platform/truncate.js'
import type { ProjectBriefApi, ProjectBriefFields } from './api.js'
import { createProjectBrief, deleteProjectBrief, getProjectBrief, updateProjectBrief } from './default.js'

type Brief = { gid: string; title?: string; text?: string; permalink_url?: string }

function fmtBrief(b: Brief) {
	printFields({
		ID: b.gid,
		Title: b.title ?? null,
		Text: truncate(b.text, { full: isFull() }) || null,
		URL: b.permalink_url ?? null,
	})
}

function resolveProjectBriefApi(api?: ProjectBriefApi | (() => ProjectBriefApi)): ProjectBriefApi {
	if (typeof api === 'function') return api()
	return api ?? { getProjectBrief, createProjectBrief, updateProjectBrief, deleteProjectBrief }
}

type WriteOpts = { title?: string; text?: string; htmlText?: string }

function addWriteOptions<T extends Command>(cmd: T) {
	return cmd
		.option('--title <title>', 'Brief title')
		.option('--text <text>', 'Brief body as plain text')
		.option(
			'--html-text <html>',
			'Brief body as Asana rich text HTML (a <body> wrapper; see `cyber-asana html rules --surface project-brief`)',
		)
}

function fieldsFrom(opts: WriteOpts): ProjectBriefFields {
	return {
		...(opts.title !== undefined && { title: opts.title }),
		...(opts.text !== undefined && { text: opts.text }),
		...(opts.htmlText !== undefined && { html_text: opts.htmlText }),
	}
}

export function projectBriefCommand(api?: ProjectBriefApi | (() => ProjectBriefApi)) {
	const cmd = new Command('project-brief').description(
		"Read and write a project's brief (its charter or sprint goal, as Asana rich text)",
	)

	addReadOptions(cmd.command('get <gid>').description('Get a project brief by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveProjectBriefApi(api).getProjectBrief(gid, readOptionsFromCli(opts))
			output(data, () => fmtBrief(data))
		},
	)

	addWriteOptions(
		addGidOption(
			cmd.command('create').description('Create the brief of a project'),
			'project',
			'Project GID the brief belongs to',
		),
	).action(async (opts: WriteOpts & { project?: string; projectGid?: string }) => {
		const projectGid = requiredGid(opts, 'project', 'Project GID')
		const data = await resolveProjectBriefApi(api).createProjectBrief(projectGid, fieldsFrom(opts))
		output(data, () => {
			fmtBrief(data)
			printNextSteps([`cyber-asana project-brief get ${data.gid} — read the brief back`])
		})
	})

	addWriteOptions(cmd.command('update <gid>').description('Update a project brief; give at least one field')).action(
		async (gid: string, opts: WriteOpts) => {
			const fields = fieldsFrom(opts)
			if (Object.keys(fields).length === 0) {
				throw new Error('Nothing to update: give at least one of --title, --text, --html-text')
			}
			const data = await resolveProjectBriefApi(api).updateProjectBrief(gid, fields)
			output(data, () => fmtBrief(data))
		},
	)

	cmd
		.command('delete <gid>')
		.description('Delete a project brief (succeeds when it is already gone)')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('project_brief', gid, () =>
				resolveProjectBriefApi(api).deleteProjectBrief(gid),
			)
			output(result, () => console.log(deleteMessage(result, 'Project brief')))
		})

	return cmd
}
