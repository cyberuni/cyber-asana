#!/usr/bin/env node
import { Command } from 'commander'
import { defaultAmbientDeps, ensureStoredCredential } from './auth/ambient.js'
import { exitCodeFor, renderCliError } from './cli-error.js'
import { installUsageErrors, isCleanCommanderExit } from './cli-usage.js'
import { createRuntimeContext, type RuntimeContext, registerCliCommands } from './composition.js'
import { runDefaultCommand } from './default-command.js'
import { selectFormat } from './output.js'
import { setAmbientToken, setTokenOverride } from './platform/client.js'
import { envValue } from './platform/env.js'
import { getMe } from './users/api.js'
import { VERSION } from './version.js'

const program = new Command()
let runtimeContext: RuntimeContext | undefined

function getRuntimeContext() {
	runtimeContext ??= createRuntimeContext()
	return runtimeContext
}

program
	.name('cyber-asana')
	.description('Asana CLI for AI agents')
	.version(VERSION)
	.option('--token <token>', 'Asana PAT — overrides ASANA_ACCESS_TOKEN env var')
	.option('--json', 'Output raw JSON instead of formatted text')
	.option('--toon', 'Output token-efficient TOON instead of formatted text (recommended for agents)')
	.option('--full', 'Show full field values instead of truncating large text')
	.addHelpText(
		'after',
		[
			'',
			'Authentication: set ASANA_ACCESS_TOKEN env var (preferred; ASANA_TOKEN is deprecated) or pass --token <pat>.',
			'Output: default is human-readable text; use --toon for token-efficient agent output or --json for raw JSON.',
			'',
			'Examples:',
			'  cyber-asana                       # show the authenticated user (live data)',
			'  cyber-asana task my-tasks list --workspace-gid <gid> --toon',
			'  cyber-asana <resource> --help     # concise per-resource reference',
		].join('\n'),
	)
	.hook('preAction', async () => {
		const { token } = program.opts<{ token?: string }>()
		if (token) {
			setTokenOverride(token)
			return
		}
		// An explicit env var wins over whatever `auth login` stored, so there is
		// nothing to load — and no reason to touch the disk or refresh a token.
		if (envValue('ASANA_TOKEN')) return

		const { tokens, refreshError } = await ensureStoredCredential(defaultAmbientDeps())
		if (refreshError) console.error(`cyber-asana: ${refreshError}`)
		if (tokens) setAmbientToken(tokens.accessToken)
	})
	.action(async () => {
		await runDefaultCommand({ getMe })
	})

registerCliCommands(program, getRuntimeContext)
installUsageErrors(program)

program.parseAsync(process.argv).catch((err: unknown) => {
	// --help and --version reach here as Commander "exits", not failures.
	if (isCleanCommanderExit(err)) process.exit(err.exitCode ?? 0)
	console.error(renderCliError(err, selectFormat()))
	process.exit(exitCodeFor(err))
})
