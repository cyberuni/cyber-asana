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
import { createTag, getTag, listTags } from './api.js'

type Tag = { gid: string; name: string; color?: string | null }

function fmtTag(t: Tag) {
	printFields({ Name: t.name, ID: t.gid, Color: t.color ?? null })
}

export function tagCommand() {
	const cmd = new Command('tag').description('Manage Asana tags')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List tags in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const data = await listTags(requiredGid(opts, 'workspace', 'Workspace GID'), paginationOptionsFromCli(opts))
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (t: Tag) => t.name },
					{ label: 'ID', get: (t: Tag) => t.gid },
					{ label: 'Color', get: (t: Tag) => t.color ?? '' },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a tag by GID')
		.action(async (gid: string) => {
			const data = await getTag(gid)
			output(data, () => fmtTag(data))
		})

	const createCmd = addGidOption(
		cmd.command('create <name>').description('Create a tag'),
		'workspace',
		'Workspace GID',
		{
			env: 'ASANA_WORKSPACE',
		},
	)
	createCmd.action(async (name: string, opts: { workspace?: string; workspaceGid?: string }) => {
		const data = await createTag(requiredGid(opts, 'workspace', 'Workspace GID'), name)
		output(data, () => fmtTag(data))
	})

	return cmd
}
