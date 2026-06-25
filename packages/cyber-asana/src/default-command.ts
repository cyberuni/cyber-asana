import { output, printFields, printNextSteps } from './output.js'

// Content-first default — principle 8. Running the CLI with no arguments shows
// live data (the authenticated user) instead of help text.

export type DefaultCommandDeps = {
	getMe: () => Promise<{ gid: string; name: string; email?: string }>
}

export async function runDefaultCommand(deps: DefaultCommandDeps, argv: string[] = process.argv) {
	const me = await deps.getMe()
	output(
		me,
		() => {
			printFields({ Name: me.name, ID: me.gid, Email: me.email ?? null })
			printNextSteps([
				'cyber-asana task my-tasks list --workspace-gid <gid> — your tasks',
				'cyber-asana workspace list — your workspaces',
				'cyber-asana --help — all commands',
			])
		},
		argv,
	)
}
