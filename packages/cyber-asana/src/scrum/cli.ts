import { Command, InvalidArgumentError } from 'commander'
import { resolveProjectRef } from '../config/repo-config.js'
import { SCOPE_KINDS, SCOPE_OVERRIDE_KEYS, type ScopeEntry, type ScopeKind } from '../config/scopes.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../platform/cli/output.js'
import type { ScrumApi } from './api.js'
import { createDefaultScrumApi } from './default.js'

type ResolveApi = ScrumApi | (() => ScrumApi)

function resolveApi(api?: ResolveApi): ScrumApi {
	if (typeof api === 'function') return api()
	return api ?? createDefaultScrumApi()
}

type StoreFlags = { config?: string; repo?: string; global?: boolean }

function storeOptions(opts: StoreFlags) {
	return { configPath: opts.config, repo: opts.repo }
}

function collect(value: string, previous: string[]) {
	return [
		...previous,
		...value
			.split(',')
			.map((piece) => piece.trim())
			.filter((piece) => piece.length > 0),
	]
}

function scopeKind(value: string): ScopeKind {
	if (!(SCOPE_KINDS as readonly string[]).includes(value)) {
		throw new InvalidArgumentError(`Unknown scope kind "${value}". Expected one of: ${SCOPE_KINDS.join(', ')}`)
	}
	return value as ScopeKind
}

function positiveInt(value: string) {
	if (!/^\d+$/.test(value) || Number(value) <= 0) throw new InvalidArgumentError('must be a positive integer')
	return Number(value)
}

function members(scope: ScopeEntry): string {
	return scope.kind === 'portfolio' ? (scope.portfolio ?? '') : (scope.projects ?? []).join(', ')
}

function overrides(scope: ScopeEntry): string {
	return SCOPE_OVERRIDE_KEYS.filter((key) => scope[key] !== undefined)
		.map((key) => `${key}=${scope[key]}`)
		.join(' ')
}

type AddFlags = StoreFlags & {
	kind: ScopeKind
	project: string[]
	portfolio?: string
	default?: boolean
	sprintModel?: string
	sprintLengthDays?: number
	sprintAnchorDate?: string
}

/** `config scope add | remove | list`, mounted under the `config` command by the composition root. */
export function scopeConfigCommand(api?: ResolveApi) {
	const cmd = new Command('scope').description(
		'Manage scrum scopes: the Asana projects a scrum team works in (.agents/cyber-asana.json, schema 3)',
	)
	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana config scope add web --kind project --project <gid> --default',
			'  cyber-asana config scope add platform --kind projects --project <gid>,<gid> --sprint-length-days 7',
			'  cyber-asana config scope add growth --kind portfolio --portfolio <gid>',
			'  cyber-asana config scope add mine --kind projects --project <gid>,<gid> --global   # personal registry',
			'  cyber-asana config scope list',
			'  cyber-asana config scope remove platform',
		].join('\n'),
	)

	cmd
		.command('add <name>')
		.description('Add a scope, or replace the one with that name (the file becomes schema_version 3)')
		.requiredOption('--kind <kind>', `Scope kind: ${SCOPE_KINDS.join(', ')}`, scopeKind)
		.option('--project <gid-or-alias>', 'Project GID or registered alias, comma-separated or repeated', collect, [])
		.option('--portfolio <gid>', 'Portfolio GID, for kind portfolio')
		.option('--default', 'Use this scope when a command is given no --scope')
		.option('--sprint-model <model>', 'Override the policy sprint_model for this scope')
		.option('--sprint-length-days <n>', 'Override the policy sprint_length_days for this scope', positiveInt)
		.option('--sprint-anchor-date <date>', 'Override the policy sprint_anchor_date (YYYY-MM-DD) for this scope')
		.option(
			'--global',
			"Save to the global registry (~/.config/cyber-asana) for this repo instead of the repo's config",
		)
		.option('--repo <key>', 'Repo key for --global (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (name: string, opts: AddFlags) => {
			const projects = opts.project.length
				? (await Promise.all(opts.project.map((ref) => resolveProjectRef(ref, { configPath: opts.config })))).flatMap(
						(gids) => (gids as string).split(','),
					)
				: undefined
			const scope: ScopeEntry = {
				name,
				kind: opts.kind,
				...(projects && { projects }),
				...(opts.portfolio !== undefined && { portfolio: opts.portfolio }),
				...(opts.default && { default: true as const }),
				...(opts.sprintModel !== undefined && { sprint_model: opts.sprintModel }),
				...(opts.sprintLengthDays !== undefined && { sprint_length_days: opts.sprintLengthDays }),
				...(opts.sprintAnchorDate !== undefined && { sprint_anchor_date: opts.sprintAnchorDate }),
			}
			const saved = await resolveApi(api).addScope(scope, { ...storeOptions(opts), global: opts.global })
			output(saved, () => {
				console.log(`Added scope ${name} to ${saved.path}`)
				printNextSteps([`cyber-asana scrum scope resolve --scope ${name} — check what it covers`])
			})
		})

	cmd
		.command('remove <name>')
		.description('Remove a scope by name (from the repo config, else the global registry)')
		.option('--global', 'Remove from the global registry only')
		.option('--repo <key>', 'Repo key for --global (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (name: string, opts: StoreFlags) => {
			const result = await resolveApi(api).removeScope(name, { ...storeOptions(opts), global: opts.global })
			output(result, () =>
				console.log(
					result.already_absent ? `Scope ${name} was already absent` : `Removed scope ${name} from ${result.path}`,
				),
			)
		})

	cmd
		.command('list')
		.description('List scopes from the repo config and the global registry, and which is the default')
		.option('--repo <key>', 'Repo key for the global registry (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (opts: StoreFlags) => {
			const listing = await resolveApi(api).listScopes(storeOptions(opts))
			output(listing, () => {
				printTable(
					listing.scopes,
					[
						{ label: 'Name', get: (s) => s.name },
						{ label: 'Kind', get: (s) => s.kind },
						{ label: 'Members', get: members },
						{ label: 'Default', get: (s) => (s.default ? 'yes' : '') },
						{ label: 'Source', get: (s) => s.source },
						{ label: 'Overrides', get: overrides },
					],
					{ entity: 'scopes' },
				)
				printCountSummary(listing.scopes.length, 'scope(s)')
				printNextSteps(
					listing.scopes.length > 0
						? ['cyber-asana scrum scope resolve --scope <name> — see the projects a scope covers']
						: ['cyber-asana config scope add <name> --kind project --project <gid> — add a scope'],
				)
				if (listing.implicit) {
					console.log(
						`Commands use the implicit project scope "${listing.implicit.name}" (the repo's default project) until a scope is added`,
					)
				}
			})
		})

	return cmd
}

/** `scrum scope resolve`. Later units add sprint, backlog, and report commands under `scrum`. */
export function scrumCommand(api?: ResolveApi) {
	const cmd = new Command('scrum').description('Scrum on Asana: scopes, sprints, and reports')
	const scope = cmd.command('scope').description('Work with scrum scopes')

	scope
		.command('resolve')
		.description('Resolve a scope to the projects it covers and its effective sprint settings')
		.option('--scope <name>', 'Scope name (default: the scope marked default, else the repo default project)')
		.option('--tasks', "Also list the scope's tasks, each counted once however many of its projects it is in")
		.option('--repo <key>', 'Repo key for the global registry (default: derived from the git remote)')
		.option('--config <path>', 'Config file path (overrides CYBER_ASANA_CONFIG)')
		.action(async (opts: StoreFlags & { scope?: string; tasks?: boolean }) => {
			const resolved = await resolveApi(api).resolveScope(
				{ ...(opts.scope !== undefined && { scope: opts.scope }), ...(opts.tasks && { tasks: true }) },
				storeOptions(opts),
			)
			output(resolved, () => {
				printFields({
					Scope: resolved.implicit
						? `${resolved.scope.name} (implicit: the repo's default project)`
						: resolved.scope.name,
					Kind: resolved.scope.kind,
					...Object.fromEntries(Object.entries(resolved.sprint).map(([key, value]) => [key, String(value)])),
				})
				printTable(
					resolved.projects,
					[
						{ label: 'Project GID', get: (p) => p.gid },
						{ label: 'Name', get: (p) => p.name ?? '' },
					],
					{ entity: 'projects' },
				)
				printCountSummary(resolved.projects.length, 'project(s)')
				if (resolved.tasks) console.log(`\n${resolved.tasks.length} task(s) across the scope`)
			})
		})

	return cmd
}
