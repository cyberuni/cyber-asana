import { VERSION } from '../../version.js'
import { output, printFields, printNextSteps } from './output.js'

// Content-first default — principle 8. Running the CLI with no arguments shows
// live data (the authenticated user) instead of help text, prefixed by the
// lines that identify the tool itself so an agent that lands here knows what it
// is holding and how to invoke it — principle 10.

export const BIN_NAME = 'cyber-asana'
export const BIN_DESCRIPTION = 'Asana CLI for AI agents'

export type DefaultCommandDeps = {
	getMe: () => Promise<{ gid: string; name?: string; email?: string }>
}

export async function runDefaultCommand(deps: DefaultCommandDeps, argv: string[] = process.argv) {
	const me = await deps.getMe()
	output(
		{ bin: BIN_NAME, description: BIN_DESCRIPTION, version: VERSION, user: me },
		() => {
			printFields({
				bin: BIN_NAME,
				description: BIN_DESCRIPTION,
				version: VERSION,
				Name: me.name ?? null,
				ID: me.gid,
				Email: me.email ?? null,
			})
			printNextSteps([
				'cyber-asana task my-tasks list --workspace-gid <gid> — your tasks',
				'cyber-asana workspace list — your workspaces',
				'cyber-asana --help — all commands',
			])
		},
		argv,
	)
}
