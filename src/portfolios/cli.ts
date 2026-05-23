import { Command, Option } from 'commander'
import { addPaginationOptions, itemsForOutput, paginationOptionsFromCli, printNextPageHint } from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import { createPortfolio, deletePortfolio, getPortfolio, listPortfolios, updatePortfolio } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

type Portfolio = { gid: string; name: string; permalink_url?: string }

function fmtPortfolio(p: Portfolio) {
	printFields({ Name: p.name, ID: p.gid, URL: p.permalink_url ?? null })
}

export function portfolioCommand() {
	const cmd = new Command('portfolio').description('Manage Asana portfolios')

	addPaginationOptions(
		cmd.command('list').description('List portfolios in a workspace').addOption(workspaceOpt()),
	).action(async (opts: { workspace: string; limit?: number; offset?: string; optFields?: string }) => {
		const data = await listPortfolios(opts.workspace, paginationOptionsFromCli(opts))
		output(data, () => {
			printTable(itemsForOutput(data), [
				{ label: 'Name', get: (p: Portfolio) => p.name },
				{ label: 'ID', get: (p: Portfolio) => p.gid },
			])
			printNextPageHint(data)
		})
	})

	cmd
		.command('get <gid>')
		.description('Get a portfolio by GID')
		.action(async (gid: string) => {
			const data = await getPortfolio(gid)
			output(data, () => fmtPortfolio(data))
		})

	cmd
		.command('create <name>')
		.description('Create a portfolio')
		.addOption(workspaceOpt())
		.action(async (name: string, opts: { workspace: string }) => {
			const data = await createPortfolio(opts.workspace, name)
			output(data, () => fmtPortfolio(data))
		})

	cmd
		.command('update <gid>')
		.description('Update a portfolio')
		.option('--name <name>', 'New name')
		.action(async (gid: string, opts: { name?: string }) => {
			const data = await updatePortfolio(gid, opts)
			output(data, () => fmtPortfolio(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a portfolio')
		.action(async (gid: string) => {
			await deletePortfolio(gid)
			console.log(`Deleted portfolio ${gid}`)
		})

	return cmd
}
