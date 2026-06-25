#!/usr/bin/env node
import { Command } from 'commander'
import { exitCodeFor, renderCliError } from './cli-error.js'
import { setTokenOverride } from './client.js'
import { createRuntimeContext, type RuntimeContext, registerCliCommands } from './composition.js'
import { selectFormat } from './output.js'
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
	.addHelpText(
		'after',
		'\nAuthentication: set ASANA_ACCESS_TOKEN env var (preferred; ASANA_TOKEN is deprecated) or pass --token <pat>.\nOutput: default is human-readable text; use --toon for token-efficient agent output or --json for raw JSON.',
	)
	.hook('preAction', () => {
		const { token } = program.opts<{ token?: string }>()
		if (token) setTokenOverride(token)
	})

registerCliCommands(program, getRuntimeContext)

program.parseAsync(process.argv).catch((err: unknown) => {
	console.error(renderCliError(err, selectFormat()))
	process.exit(exitCodeFor(err))
})
