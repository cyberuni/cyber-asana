#!/usr/bin/env node
import { Command } from 'commander'
import { attachmentCommand } from './attachments/cli.js'
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
	.addHelpText('after', '\nSet ASANA_TOKEN env var to authenticate.')

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

program.parseAsync(process.argv).catch((err: unknown) => {
	console.error(err instanceof Error ? err.message : String(err))
	process.exit(1)
})
