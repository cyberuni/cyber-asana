#!/usr/bin/env node
import { Command } from 'commander'
import { attachmentCommand } from './attachments/cli.js'
import { setTokenOverride } from './client.js'
import { goalCommand } from './goals/cli.js'
import { portfolioCommand } from './portfolios/cli.js'
import { projectCommand } from './projects/cli.js'
import { sectionCommand } from './sections/cli.js'
import { storyCommand } from './stories/cli.js'
import { tagCommand } from './tags/cli.js'
import { taskCommand } from './tasks/cli.js'
import { teamCommand } from './teams/cli.js'
import { userCommand } from './users/cli.js'
import { workspaceCommand } from './workspaces/cli.js'

const program = new Command()

program
	.name('cyber-asana')
	.description('Asana CLI for AI agents')
	.version('0.0.0')
	.option('--token <token>', 'Asana PAT — overrides ASANA_TOKEN env var')
	.option('--json', 'Output raw JSON instead of formatted text')
	.addHelpText('after', '\nAuthentication: set ASANA_TOKEN env var or pass --token <pat>.')
	.hook('preAction', () => {
		const { token } = program.opts<{ token?: string }>()
		if (token) setTokenOverride(token)
	})

program.addCommand(workspaceCommand())
program.addCommand(projectCommand())
program.addCommand(taskCommand())
program.addCommand(sectionCommand())
program.addCommand(userCommand())
program.addCommand(teamCommand())
program.addCommand(portfolioCommand())
program.addCommand(goalCommand())
program.addCommand(tagCommand())
program.addCommand(attachmentCommand())
program.addCommand(storyCommand())
program.addCommand(storyCommand('comment'))

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
