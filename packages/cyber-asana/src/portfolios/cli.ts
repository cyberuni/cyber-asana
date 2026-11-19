import { Command, Option } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../platform/cli/options.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import { deleteIdempotently, deleteMessage } from '../platform/idempotent-delete.js'
import type { PortfolioApi } from './api.js'
import {
	addPortfolioItem,
	createPortfolio,
	deletePortfolio,
	getPortfolio,
	listPortfolioItems,
	listPortfolios,
	removePortfolioItem,
	updatePortfolio,
} from './default.js'
import { PORTFOLIO_COLORS, PORTFOLIO_DEFAULT_ACCESS_LEVELS, PORTFOLIO_RESOURCE_SUBTYPES } from './portfolio-enums.js'
import { buildPortfolioCreateFields, buildPortfolioUpdateFields } from './write-options.js'

type Portfolio = { gid: string; name?: string; permalink_url?: string }

function fmtPortfolio(p: Portfolio) {
	printFields({ Name: p.name ?? null, ID: p.gid, URL: p.permalink_url ?? null })
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
			addPortfolioItem,
			removePortfolioItem,
		}
	)
}

type PortfolioWriteCliOptions = {
	archived?: boolean
	color?: string
	customType?: string
	resourceSubtype?: string
	defaultAccessLevel?: string
	public?: boolean
	dueOn?: string
	startOn?: string
}

function collectOption(value: string, previous: string[] = []) {
	return [...previous, value]
}

/** The write flags `portfolio create` and `portfolio update` share. */
function addPortfolioWriteOptions<T extends Command>(cmd: T) {
	return cmd
		.option('--archived', 'Archive the portfolio')
		.option('--no-archived', 'Do not archive the portfolio')
		.addOption(new Option('--color <color>', 'Portfolio color').choices(PORTFOLIO_COLORS))
		.option('--custom-type <gid>', 'Custom type GID; Asana accepts it only with --resource-subtype custom')
		.addOption(
			new Option('--resource-subtype <subtype>', 'Portfolio resource subtype').choices(PORTFOLIO_RESOURCE_SUBTYPES),
		)
		.addOption(
			new Option('--default-access-level <level>', 'Default access level for members').choices(
				PORTFOLIO_DEFAULT_ACCESS_LEVELS,
			),
		)
		.option('--public', 'Make the portfolio public to the workspace (new portfolios are private)')
		.option('--no-public', 'Make the portfolio private')
		.option('--due-on <date>', 'Due date (YYYY-MM-DD)')
		.option('--start-on <date>', 'Start date (YYYY-MM-DD); Asana requires --due-on with it, and not before it')
}

// Minimal default schema for portfolio lists — principle 2.
const PORTFOLIO_LIST_FIELDS = 'gid,name'

const PORTFOLIO_LIST_NEXT_STEPS = [
	'cyber-asana portfolio items <gid> — list the projects in a portfolio',
	'cyber-asana portfolio get <gid> — view a portfolio',
]

export function portfolioCommand(api?: PortfolioApi | (() => PortfolioApi)) {
	const cmd = new Command('portfolio').description('Manage Asana portfolios')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana portfolio list --workspace-gid <gid>',
			'  cyber-asana portfolio list --workspace-gid <gid> --owner-gid <user-gid>',
			'  cyber-asana portfolio items <gid>',
			'  cyber-asana portfolio get <gid> --toon',
			'  cyber-asana portfolio create "Roadmap" --workspace-gid <gid>',
			'  cyber-asana portfolio update <gid> --name "Renamed"',
			'  cyber-asana portfolio delete <gid>',
			'  cyber-asana portfolio item add <portfolio-gid> <project-gid>',
			'  cyber-asana portfolio item remove <portfolio-gid> <project-gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(
			addGidOption(cmd.command('list').description('List portfolios in a workspace'), 'workspace', 'Workspace GID'),
			'owner',
			'Only list portfolios owned by this user GID (service accounts only)',
		).option('--custom-type <gid>', 'Only portfolios of this custom type GID ("" for portfolios with no custom type)'),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			owner?: string
			ownerGid?: string
			customType?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= PORTFOLIO_LIST_FIELDS
			const owner = normalizedGid(opts, 'owner')
			const data = await resolvePortfolioApi(api).listPortfolios(requiredGid(opts, 'workspace', 'Workspace GID'), {
				...pagination,
				...(owner ? { owner } : {}),
				...(opts.customType !== undefined && { customType: opts.customType }),
			})
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (p: Portfolio) => p.name ?? '' },
						{ label: 'ID', get: (p: Portfolio) => p.gid },
					],
					{ entity: 'portfolios' },
				)
				printCountSummary(items.length, 'portfolio(s)')
				printNextPageHint(data)
				printNextSteps(PORTFOLIO_LIST_NEXT_STEPS)
			})
		},
	)

	addPaginationOptions(cmd.command('items <gid>').description('List the items (projects) in a portfolio')).action(
		async (gid: string, opts: { limit?: number; offset?: string; optFields?: string }) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= PORTFOLIO_LIST_FIELDS
			const data = await resolvePortfolioApi(api).listPortfolioItems(gid, pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (p: Portfolio) => p.name ?? '' },
						{ label: 'ID', get: (p: Portfolio) => p.gid },
					],
					{ entity: 'portfolio items' },
				)
				printCountSummary(items.length, 'item(s)')
				printNextPageHint(data)
				printNextSteps(['cyber-asana project get <gid> — view a project in this portfolio'])
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a portfolio by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolvePortfolioApi(api).getPortfolio(gid, readOptionsFromCli(opts))
			output(data, () => fmtPortfolio(data))
		},
	)

	const createCmd = addPortfolioWriteOptions(
		addGidOption(
			addReadOptions(cmd.command('create <name>').description('Create a portfolio')),
			'workspace',
			'Workspace GID',
		),
	)
	createCmd.action(
		async (
			name: string,
			opts: PortfolioWriteCliOptions & { workspace?: string; workspaceGid?: string; optFields?: string },
		) => {
			const data = await resolvePortfolioApi(api).createPortfolio(
				requiredGid(opts, 'workspace', 'Workspace GID'),
				name,
				readOptionsFromCli(opts),
				buildPortfolioCreateFields(opts),
			)
			output(data, () => fmtPortfolio(data))
		},
	)

	addPortfolioWriteOptions(
		addReadOptions(cmd.command('update <gid>').description('Update a portfolio').option('--name <name>', 'New name')),
	)
		.option('--custom-fields-json <json>', 'Custom field values as a JSON object of field GID to value')
		.option('--custom-field <gid=value>', 'Custom field value, repeatable', collectOption, [])
		.option(
			'--html-custom-fields-json <json>',
			'Text custom field values as HTML, a JSON object of field GID to "<body>...</body>"',
		)
		.option('--html-custom-field <gid=html>', 'Text custom field value as HTML, repeatable', collectOption, [])
		.action(
			async (
				gid: string,
				opts: PortfolioWriteCliOptions & {
					name?: string
					customFieldsJson?: string
					customField?: string[]
					htmlCustomFieldsJson?: string
					htmlCustomField?: string[]
					optFields?: string
				},
			) => {
				const data = await resolvePortfolioApi(api).updatePortfolio(
					gid,
					buildPortfolioUpdateFields({
						...opts,
						customFieldEntries: opts.customField,
						htmlCustomFieldEntries: opts.htmlCustomField,
					}),
					readOptionsFromCli(opts),
				)
				output(data, () => fmtPortfolio(data))
			},
		)

	cmd
		.command('delete <gid>')
		.description('Delete a portfolio')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('portfolio', gid, () => resolvePortfolioApi(api).deletePortfolio(gid))
			output(result, () => console.log(deleteMessage(result, 'Portfolio')))
		})

	const item = cmd.command('item').description('Add or remove a portfolio item (a project or a nested portfolio)')

	item
		.command('add <portfolio-gid> <item-gid>')
		.description('Add a project or portfolio to a portfolio; adding an item already there changes nothing')
		.option('--insert-before <gid>', 'Place the item before this existing item')
		.option('--insert-after <gid>', 'Place the item after this existing item')
		.action(async (portfolioGid: string, itemGid: string, opts: { insertBefore?: string; insertAfter?: string }) => {
			const placement = {
				...(opts.insertBefore !== undefined && { insertBefore: opts.insertBefore }),
				...(opts.insertAfter !== undefined && { insertAfter: opts.insertAfter }),
			}
			const result = await resolvePortfolioApi(api).addPortfolioItem(portfolioGid, itemGid, placement)
			output(result, () => {
				console.log(
					result.status === 'added'
						? `Added ${itemGid} to portfolio ${portfolioGid}`
						: `${itemGid} was already in portfolio ${portfolioGid}`,
				)
				printNextSteps([`cyber-asana portfolio items ${portfolioGid} — list the portfolio's items`])
			})
		})

	item
		.command('remove <portfolio-gid> <item-gid>')
		.description('Remove an item from a portfolio; removing one that is not there changes nothing')
		.action(async (portfolioGid: string, itemGid: string) => {
			const result = await resolvePortfolioApi(api).removePortfolioItem(portfolioGid, itemGid)
			output(result, () => {
				console.log(
					result.status === 'removed'
						? `Removed ${itemGid} from portfolio ${portfolioGid}`
						: `${itemGid} was not in portfolio ${portfolioGid}`,
				)
				printNextSteps([`cyber-asana portfolio items ${portfolioGid} — list the portfolio's items`])
			})
		})

	return cmd
}
