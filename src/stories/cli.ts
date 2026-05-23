import { Command } from 'commander'
import { createStory, listStories } from './api.js'

export function storyCommand() {
	const cmd = new Command('story').description('Manage Asana stories (comments)')

	cmd
		.command('list')
		.description('List stories for a task')
		.requiredOption('--task <gid>', 'Task GID')
		.action(async (opts: { task: string }) => {
			console.log(JSON.stringify(await listStories(opts.task), null, 2))
		})

	cmd
		.command('create <text>')
		.description('Add a comment to a task')
		.requiredOption('--task <gid>', 'Task GID')
		.action(async (text: string, opts: { task: string }) => {
			console.log(JSON.stringify(await createStory(opts.task, text), null, 2))
		})

	return cmd
}
