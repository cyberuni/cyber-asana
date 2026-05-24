import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	requiredGid,
} from '../cli-options.js'
import { output, printFields, printTable } from '../output.js'
import { createStory, getTaskTemplateData, interpolateTemplate, listStories } from './api.js'
import type { StoryApi } from './api.js'

type Story = { gid: string; type?: string; text?: string; created_by?: { name: string } | null; created_at?: string }

function fmtStory(s: Story) {
	printFields({
		ID: s.gid,
		Type: s.type ?? null,
		By: s.created_by?.name ?? null,
		At: s.created_at ?? null,
		Text: s.text ?? null,
	})
}

function resolveStoryApi(api?: StoryApi | (() => StoryApi)): StoryApi {
	if (typeof api === 'function') return api()
	return api ?? { listStories, createStory, getTaskTemplateData }
}

export function storyCommand(name = 'story', api?: StoryApi | (() => StoryApi)) {
	const cmd = new Command(name).description('Manage Asana stories (comments)')

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List stories for a task'), 'task', 'Task GID'),
	).action(async (opts: { task?: string; taskGid?: string; limit?: number; offset?: string; optFields?: string }) => {
		const data = await resolveStoryApi(api).listStories(
			requiredGid(opts, 'task', 'Task GID'),
			paginationOptionsFromCli(opts),
		)
		output(data, () => {
			printTable(itemsForOutput(data), [
				{ label: 'ID', get: (s: Story) => s.gid },
				{ label: 'Type', get: (s: Story) => s.type ?? '' },
				{ label: 'By', get: (s: Story) => s.created_by?.name ?? '' },
				{ label: 'Text', get: (s: Story) => (s.text ?? '').slice(0, 60) },
			])
			printNextPageHint(data)
		})
	})

	addGidOption(
		cmd
			.command('create [text]')
			.description('Add a comment to a task')
			.option('--html-text <html>', 'Comment rich text as Asana HTML')
			.option(
				'--template',
				'Treat text as a template; interpolates {task.name}, {task.assignee}, {task.due_on}, {task.notes}',
			),
		'task',
		'Task GID',
	).action(
		async (
			text: string | undefined,
			opts: { task?: string; taskGid?: string; template?: boolean; htmlText?: string },
		) => {
			const taskGid = requiredGid(opts, 'task', 'Task GID')
			const task = opts.template ? await resolveStoryApi(api).getTaskTemplateData(taskGid) : undefined
			const data = await resolveStoryApi(api).createStory(taskGid, {
				...(text !== undefined && { text: task ? interpolateTemplate(text, task) : text }),
				...(opts.htmlText !== undefined && {
					html_text: task ? interpolateTemplate(opts.htmlText, task) : opts.htmlText,
				}),
			})
			output(data, () => fmtStory(data))
		},
	)

	return cmd
}
