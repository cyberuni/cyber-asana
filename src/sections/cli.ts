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
import type { SectionApi } from './api.js'
import { createSection, deleteSection, getSection, listSections, updateSection } from './api.js'

type Section = { gid: string; name: string }

function fmtSection(s: Section) {
	printFields({ Name: s.name, ID: s.gid })
}

function resolveSectionApi(api?: SectionApi | (() => SectionApi)): SectionApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listSections,
			getSection,
			createSection,
			updateSection,
			deleteSection,
		}
	)
}

export function sectionCommand(api?: SectionApi | (() => SectionApi)) {
	const cmd = new Command('section').description('Manage Asana sections')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List sections in a project'), 'project', 'Project GID'),
	).action(
		async (opts: { project?: string; projectGid?: string; limit?: number; offset?: string; optFields?: string }) => {
			const data = await resolveSectionApi(api).listSections(
				requiredGid(opts, 'project', 'Project GID'),
				paginationOptionsFromCli(opts),
			)
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (s: Section) => s.name },
					{ label: 'ID', get: (s: Section) => s.gid },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a section by GID')
		.action(async (gid: string) => {
			const data = await resolveSectionApi(api).getSection(gid)
			output(data, () => fmtSection(data))
		})

	addGidOption(
		cmd.command('create <name>').description('Create a section in a project'),
		'project',
		'Project GID',
	).action(async (name: string, opts: { project?: string; projectGid?: string }) => {
		const data = await resolveSectionApi(api).createSection(requiredGid(opts, 'project', 'Project GID'), name)
		output(data, () => fmtSection(data))
	})

	cmd
		.command('update <gid>')
		.description('Update a section')
		.requiredOption('--name <name>', 'New name')
		.action(async (gid: string, opts: { name: string }) => {
			const data = await resolveSectionApi(api).updateSection(gid, opts.name)
			output(data, () => fmtSection(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a section')
		.action(async (gid: string) => {
			await resolveSectionApi(api).deleteSection(gid)
			console.log(`Deleted section ${gid}`)
		})

	return cmd
}
