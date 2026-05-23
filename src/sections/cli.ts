import { Command } from 'commander'
import { addPaginationOptions, itemsForOutput, paginationOptionsFromCli, printNextPageHint } from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import { createSection, deleteSection, getSection, listSections, updateSection } from './api.js'

type Section = { gid: string; name: string }

function fmtSection(s: Section) {
	printFields({ Name: s.name, ID: s.gid })
}

export function sectionCommand() {
	const cmd = new Command('section').description('Manage Asana sections')

	addPaginationOptions(
		cmd.command('list').description('List sections in a project').requiredOption('--project <gid>', 'Project GID'),
	).action(async (opts: { project: string; limit?: number; offset?: string; optFields?: string }) => {
		const data = await listSections(opts.project, paginationOptionsFromCli(opts))
		output(data, () => {
			printTable(itemsForOutput(data), [
				{ label: 'Name', get: (s: Section) => s.name },
				{ label: 'ID', get: (s: Section) => s.gid },
			])
			printNextPageHint(data)
		})
	})

	cmd
		.command('get <gid>')
		.description('Get a section by GID')
		.action(async (gid: string) => {
			const data = await getSection(gid)
			output(data, () => fmtSection(data))
		})

	cmd
		.command('create <name>')
		.description('Create a section in a project')
		.requiredOption('--project <gid>', 'Project GID')
		.action(async (name: string, opts: { project: string }) => {
			const data = await createSection(opts.project, name)
			output(data, () => fmtSection(data))
		})

	cmd
		.command('update <gid>')
		.description('Update a section')
		.requiredOption('--name <name>', 'New name')
		.action(async (gid: string, opts: { name: string }) => {
			const data = await updateSection(gid, opts.name)
			output(data, () => fmtSection(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a section')
		.action(async (gid: string) => {
			await deleteSection(gid)
			console.log(`Deleted section ${gid}`)
		})

	return cmd
}
