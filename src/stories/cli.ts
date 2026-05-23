import { Command } from 'commander'
import { output, printFields, printTable } from '../output.js'
import { createStory, listStories } from './api.js'

type Story = { gid: string; type?: string; text?: string; created_by?: { name: string } | null; created_at?: string }

function fmtStory(s: Story) {
	printFields({ ID: s.gid, Type: s.type ?? null, By: s.created_by?.name ?? null, At: s.created_at ?? null, Text: s.text ?? null })
}

export function storyCommand() {
	const cmd = new Command('story').description('Manage Asana stories (comments)')

	cmd
		.command('list')
		.description('List stories for a task')
		.requiredOption('--task <gid>', 'Task GID')
		.action(async (opts: { task: string }) => {
			const data = await listStories(opts.task)
			output(data, () =>
				printTable(data, [
					{ label: 'ID', get: (s: Story) => s.gid },
					{ label: 'Type', get: (s: Story) => s.type ?? '' },
					{ label: 'By', get: (s: Story) => s.created_by?.name ?? '' },
					{ label: 'Text', get: (s: Story) => (s.text ?? '').slice(0, 60) },
				]),
			)
		})

	cmd
		.command('create <text>')
		.description('Add a comment to a task')
		.requiredOption('--task <gid>', 'Task GID')
		.action(async (text: string, opts: { task: string }) => {
			const data = await createStory(opts.task, text)
			output(data, () => fmtStory(data))
		})

	return cmd
}
