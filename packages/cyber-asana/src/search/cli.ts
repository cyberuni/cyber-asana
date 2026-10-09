import { Argument, Command, InvalidArgumentError } from 'commander'
import { addGidOption, requiredGid } from '../platform/cli/options.js'
import { output, printCountSummary, printNextSteps, printSummary, printTable } from '../platform/cli/output.js'
import type { SearchApi } from './api.js'
import { searchObjects, TYPEAHEAD_RESOURCE_TYPES, type TypeaheadResourceType } from './api.js'

type SearchHit = { gid: string; name?: string; resource_type?: string }

function resolveSearchApi(api?: SearchApi | (() => SearchApi)): SearchApi {
	if (typeof api === 'function') return api()
	return api ?? { searchObjects }
}

// Minimal default schema for typeahead hits — principle 2. `resource_type` earns its place
// because `actor` returns a mix of users and agents.
const SEARCH_HIT_FIELDS = 'gid,name,resource_type'

const NOT_EXHAUSTIVE =
	'Typeahead returns one capped page ordered by relevance/recency and is not exhaustive — Asana advises not relying on it for accurate search results.'

function parseCount(value: string) {
	const count = Number(value)
	if (!Number.isInteger(count) || count < 1 || count > 100) {
		throw new InvalidArgumentError('count must be an integer from 1 to 100')
	}
	return count
}

export function searchCommand(api?: SearchApi | (() => SearchApi)) {
	const cmd = new Command('search').description('Find Asana objects by name via typeahead')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana search objects project "website" --workspace-gid <gid>',
			'  cyber-asana search objects user "ada" --toon',
			'',
			`Note: ${NOT_EXHAUSTIVE}`,
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	const objects = cmd
		.command('objects')
		.description('Search one object type in a workspace by name (typeahead)')
		.addArgument(
			new Argument('<resource-type>', 'Object type to search — exactly one per call').choices([
				...TYPEAHEAD_RESOURCE_TYPES,
			]),
		)
		.argument('[query]', 'Text to match; omit to list the top results for the ordering')

	addGidOption(objects, 'workspace', 'Workspace GID', { env: 'ASANA_WORKSPACE' })
		.option('--count <number>', 'Results to return, from 1 to 100 (default: 20)', parseCount)
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.addHelpText(
			'after',
			[
				'',
				`Note: ${NOT_EXHAUSTIVE}`,
				'There is no pagination — --all, --offset and --limit do not apply; use --count to widen the single page.',
				'Asana accepts one resource type per call; multiple types are not supported.',
			].join('\n'),
		)
		.action(
			async (
				resourceType: TypeaheadResourceType,
				query: string | undefined,
				opts: { workspace?: string; workspaceGid?: string; count?: number; optFields?: string },
			) => {
				const data = await resolveSearchApi(api).searchObjects(
					requiredGid(opts, 'workspace', 'Workspace GID'),
					resourceType,
					{
						query,
						count: opts.count,
						optFields: opts.optFields ?? SEARCH_HIT_FIELDS,
					},
				)
				output(data, () => {
					const items = (data ?? []) as SearchHit[]
					printTable(
						items,
						[
							{ label: 'Name', get: (hit) => hit.name ?? '' },
							{ label: 'ID', get: (hit) => hit.gid },
							{ label: 'Type', get: (hit) => hit.resource_type ?? resourceType },
						],
						{ entity: `${resourceType} results` },
					)
					printCountSummary(items.length, 'result(s)')
					printSummary(`\n${NOT_EXHAUSTIVE}`)
					printNextSteps([`cyber-asana ${resourceType} get <gid> — view a match, where that resource has a command`])
				})
			},
		)

	return cmd
}
