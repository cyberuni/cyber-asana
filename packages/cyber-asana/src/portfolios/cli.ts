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
import type { PortfolioApi } from './api.js'
import {
	createPortfolio,
	deletePortfolio,
	getPortfolio,
	listPortfolioItems,
	listPortfolios,
	updatePortfolio,
} from './api.js'

type Portfolio = { gid: string; name: string; permalink_url?: string }

function fmtPortfolio(p: Portfolio) {
	printFields({ Name: p.name, ID: p.gid, URL: p.permalink_url ?? null })
}

function resolvePortfolioApi(api?: PortfolioApi | (() => PortfolioApi)): PortfolioApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listPortfolios,
			listPortfolioItems,
			getPortfolio,
			createPortfolio,
			updatePortfolio,
			deletePortfolio,
		}
	)
}

export function portfolioCommand(api?: PortfolioApi | (() => PortfolioApi)) {
	const cmd = new Command('portfolio').description('Manage Asana portfolios')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List portfolios in a workspace'), 'workspace', 'Workspace GID', {
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
			const data = await resolvePortfolioApi(api).listPortfolios(
				requiredGid(opts, 'workspace', 'Workspace GID'),
				paginationOptionsFromCli(opts),
			)
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (p: Portfolio) => p.name },
					{ label: 'ID', get: (p: Portfolio) => p.gid },
				])
				printNextPageHint(data)
			})
		},
	)

	addPaginationOptions(cmd.command('items <gid>').description('List the items (projects) in a portfolio')).action(
		async (gid: string, opts: { limit?: number; offset?: string; optFields?: string }) => {
			const data = await resolvePortfolioApi(api).listPortfolioItems(gid, paginationOptionsFromCli(opts))
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (p: Portfolio) => p.name },
					{ label: 'ID', get: (p: Portfolio) => p.gid },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a portfolio by GID')
		.action(async (gid: string) => {
			const data = await resolvePortfolioApi(api).getPortfolio(gid)
			output(data, () => fmtPortfolio(data))
		})

	const createCmd = addGidOption(
		cmd.command('create <name>').description('Create a portfolio'),
		'workspace',
		'Workspace GID',
		{
			env: 'ASANA_WORKSPACE',
		},
	)
	createCmd.action(async (name: string, opts: { workspace?: string; workspaceGid?: string }) => {
		const data = await resolvePortfolioApi(api).createPortfolio(requiredGid(opts, 'workspace', 'Workspace GID'), name)
		output(data, () => fmtPortfolio(data))
	})

	cmd
		.command('update <gid>')
		.description('Update a portfolio')
		.option('--name <name>', 'New name')
		.action(async (gid: string, opts: { name?: string }) => {
			const data = await resolvePortfolioApi(api).updatePortfolio(gid, opts)
			output(data, () => fmtPortfolio(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a portfolio')
		.action(async (gid: string) => {
			await resolvePortfolioApi(api).deletePortfolio(gid)
			console.log(`Deleted portfolio ${gid}`)
		})

	return cmd
}
