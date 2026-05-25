#!/usr/bin/env node
import { Command } from 'commander'
import { setTokenOverride } from './client.js'
import { createRuntimeContext, type RuntimeContext, registerCliCommands } from './composition.js'
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
	.option('--token <token>', 'Asana PAT — overrides ASANA_TOKEN env var')
	.option('--json', 'Output raw JSON instead of formatted text')
	.addHelpText('after', '\nAuthentication: set ASANA_TOKEN env var or pass --token <pat>.')
	.hook('preAction', () => {
		const { token } = program.opts<{ token?: string }>()
		if (token) setTokenOverride(token)
	})

registerCliCommands(program, getRuntimeContext)

program.parseAsync(process.argv).catch((err: unknown) => {
	if (err && typeof err === 'object' && 'response' in err) {
		const res = (err as { response: { body?: { errors?: { message: string }[] } } }).response
		const msgs = res?.body?.errors?.map((e) => e.message)
		if (msgs?.length) {
			console.error(`Asana API error: ${msgs.join('; ')}`)
			process.exit(1)
		}
	}
	console.error(err instanceof Error ? err.message : String(err))
	process.exit(1)
})
