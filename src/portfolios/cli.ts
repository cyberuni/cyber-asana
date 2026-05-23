import { Command, Option } from 'commander'
import { createPortfolio, deletePortfolio, getPortfolio, listPortfolios, updatePortfolio } from './api.js'

const workspaceOpt = () =>
	new Option('--workspace <gid>', 'Workspace GID (or set ASANA_WORKSPACE)').env('ASANA_WORKSPACE').makeOptionMandatory()

export function portfolioCommand() {
	const cmd = new Command('portfolio').description('Manage Asana portfolios')

	cmd
		.command('list')
		.description('List portfolios in a workspace')
		.addOption(workspaceOpt())
		.action(async (opts: { workspace: string }) => {
			console.log(JSON.stringify(await listPortfolios(opts.workspace), null, 2))
		})

	cmd
		.command('get <gid>')
		.description('Get a portfolio by GID')
		.action(async (gid: string) => {
			console.log(JSON.stringify(await getPortfolio(gid), null, 2))
		})

	cmd
		.command('create <name>')
		.description('Create a portfolio')
		.addOption(workspaceOpt())
		.action(async (name: string, opts: { workspace: string }) => {
			console.log(JSON.stringify(await createPortfolio(opts.workspace, name), null, 2))
		})

	cmd
		.command('update <gid>')
		.description('Update a portfolio')
		.option('--name <name>', 'New name')
		.action(async (gid: string, opts: { name?: string }) => {
			console.log(JSON.stringify(await updatePortfolio(gid, opts), null, 2))
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
