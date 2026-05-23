import { Command } from 'commander'
import { createSection, deleteSection, getSection, listSections, updateSection } from './api.js'

export function sectionCommand() {
	const cmd = new Command('section').description('Manage Asana sections')

	cmd
		.command('list')
		.description('List sections in a project')
		.requiredOption('--project <gid>', 'Project GID')
		.action(async (opts: { project: string }) => {
			console.log(JSON.stringify(await listSections(opts.project), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a section by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getSection(gid), null, 2))
		})

	cmd
		.command('create <name>')
		.description('Create a section in a project')
		.requiredOption('--project <gid>', 'Project GID')
		.action(async (name: string, opts: { project: string }) => {
			console.log(JSON.stringify(await createSection(opts.project, name), null, 2))
		})

	cmd
		.command('update <gid>')
		.description('Update a section')
		.requiredOption('--name <name>', 'New name')
		.action(async (gid: string, opts: { name: string }) => {
			console.log(JSON.stringify(await updateSection(gid, opts.name), null, 2))
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
