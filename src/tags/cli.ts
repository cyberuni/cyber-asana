import { Command, Option } from 'commander'
import { output, printFields, printTable } from '../output.js'
import { createTag, getTag, listTags } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

type Tag = { gid: string; name: string; color?: string | null }

function fmtTag(t: Tag) {
	printFields({ Name: t.name, ID: t.gid, Color: t.color ?? null })
}

export function tagCommand() {
	const cmd = new Command('tag').description('Manage Asana tags')

	cmd
		.command('list')
		.description('List tags in a workspace')
		.addOption(workspaceOpt())
		.action(async (opts: { workspace: string }) => {
			const data = await listTags(opts.workspace)
			output(data, () =>
				printTable(data, [
					{ label: 'Name', get: (t: Tag) => t.name },
					{ label: 'ID', get: (t: Tag) => t.gid },
					{ label: 'Color', get: (t: Tag) => t.color ?? '' },
				]),
			)
		})

	cmd
		.command('get <gid>')
		.description('Get a tag by GID')
		.action(async (gid: string) => {
			const data = await getTag(gid)
			output(data, () => fmtTag(data))
		})

	cmd
		.command('create <name>')
		.description('Create a tag')
		.addOption(workspaceOpt())
		.action(async (name: string, opts: { workspace: string }) => {
			const data = await createTag(opts.workspace, name)
			output(data, () => fmtTag(data))
		})

	return cmd
}
