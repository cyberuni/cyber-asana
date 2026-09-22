import { Command, InvalidArgumentError } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	itemsForOutput,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../cli-options.js'
import { deleteIdempotently, deleteMessage } from '../idempotent-delete.js'
import { output, printCountSummary, printFields, printNextSteps, printTable } from '../output.js'
import { isFull, truncate } from '../truncate.js'
import type { StoryApi } from './api.js'
import {
	createStory,
	deleteStory,
	getStory,
	getTaskTemplateData,
	interpolateTemplate,
	listStories,
	updateStory,
} from './api.js'
import { STICKER_NAMES } from './write-options.js'

const TEXT_COLUMN_LIMIT = 60

type Story = { gid: string; type?: string; text?: string; created_by?: { name: string } | null; created_at?: string }

function fmtStory(s: Story) {
	printFields({
		ID: s.gid,
		Type: s.type ?? null,
		By: s.created_by?.name ?? null,
		At: s.created_at ?? null,
		Text: truncate(s.text, { full: isFull() }) || null,
	})
}

// --pin and --unpin collapse to one boolean, so naming both is a usage error
// worth catching here — before any request is sent.
function pinnedFromCli(opts: { pin?: boolean; unpin?: boolean }) {
	if (opts.pin && opts.unpin) throw new InvalidArgumentError('--pin and --unpin are mutually exclusive')
	if (opts.pin) return true
	if (opts.unpin) return false
	return undefined
}

function resolveStoryApi(api?: StoryApi | (() => StoryApi)): StoryApi {
	if (typeof api === 'function') return api()
	return api ?? { listStories, createStory, getStory, updateStory, deleteStory, getTaskTemplateData }
}

// Minimal default schema for story lists — principle 2. Just the fields the
// table renders, instead of Asana's larger default payload.
const STORY_LIST_FIELDS = 'gid,type,text,created_at,created_by.name'

export function storyCommand(name = 'story', api?: StoryApi | (() => StoryApi)) {
	const cmd = new Command(name).description('Manage Asana stories (comments)')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana story list --task-gid <gid>',
			'  cyber-asana story list --task-gid <gid> --toon',
			'  cyber-asana story create "Looks good" --task-gid <gid>',
			'  cyber-asana story create "<p>Rich</p>" --task-gid <gid> --html-text "<body><p>Rich</p></body>"',
			'  cyber-asana story get <gid>',
			'  cyber-asana story update <gid> "Corrected text"',
			'  cyber-asana story update <gid> --pin',
			'  cyber-asana story delete <gid>',
			'',
			'Only comment stories you authored can be edited or deleted; system stories are immutable.',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List stories for a task'), 'task', 'Task GID'),
	).action(async (opts: { task?: string; taskGid?: string; limit?: number; offset?: string; optFields?: string }) => {
		const pagination = paginationOptionsFromCli(opts)
		pagination.optFields ??= STORY_LIST_FIELDS
		const data = await resolveStoryApi(api).listStories(requiredGid(opts, 'task', 'Task GID'), pagination)
		output(data, () => {
			const items = itemsForOutput(data)
			printTable(
				items,
				[
					{ label: 'ID', get: (s: Story) => s.gid },
					{ label: 'Type', get: (s: Story) => s.type ?? '' },
					{ label: 'By', get: (s: Story) => s.created_by?.name ?? '' },
					// The table stays readable at 60 characters; --full and the size hint come from truncate().
					{ label: 'Text', get: (s: Story) => truncate(s.text, { limit: TEXT_COLUMN_LIMIT, full: isFull() }) },
				],
				{ entity: 'stories' },
			)
			printCountSummary(items.length, 'story(s)')
			printNextPageHint(data)
			printNextSteps([
				`cyber-asana ${name} create --task-gid ${requiredGid(opts, 'task', 'Task GID')} "<text>" — comment`,
				`cyber-asana ${name} update <gid> "<text>" — fix a comment you authored`,
				`cyber-asana ${name} delete <gid> — withdraw a comment you authored`,
			])
		})
	})

	addGidOption(
		cmd
			.command('create [text]')
			.description('Add a comment to a task')
			.option('--html-text <html>', 'Comment rich text as Asana HTML')
			.option('--pin', 'Pin the new comment on the task')
			.option('--sticker <name>', `Sticker to attach (${STICKER_NAMES.join(', ')})`)
			.option(
				'--template',
				'Treat text as a template; interpolates {task.name}, {task.assignee}, {task.due_on}, {task.notes}',
			),
		'task',
		'Task GID',
	).action(
		async (
			text: string | undefined,
			opts: {
				task?: string
				taskGid?: string
				template?: boolean
				htmlText?: string
				pin?: boolean
				sticker?: string
			},
		) => {
			const taskGid = requiredGid(opts, 'task', 'Task GID')
			const task = opts.template ? await resolveStoryApi(api).getTaskTemplateData(taskGid) : undefined
			const isPinned = pinnedFromCli(opts)
			const data = await resolveStoryApi(api).createStory(taskGid, {
				...(text !== undefined && { text: task ? interpolateTemplate(text, task) : text }),
				...(opts.htmlText !== undefined && {
					html_text: task ? interpolateTemplate(opts.htmlText, task) : opts.htmlText,
				}),
				...(isPinned !== undefined && { is_pinned: isPinned }),
				...(opts.sticker !== undefined && { sticker_name: opts.sticker }),
			})
			output(data, () => fmtStory(data))
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a story (comment) by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveStoryApi(api).getStory(gid, readOptionsFromCli(opts))
			output(data, () => fmtStory(data))
		},
	)

	cmd
		.command('update <gid> [text]')
		.description('Edit a comment you authored')
		.option('--html-text <html>', 'Replacement rich text as Asana HTML')
		.option('--pin', 'Pin the comment on its task')
		.option('--unpin', 'Unpin the comment from its task')
		.option('--sticker <name>', `Sticker to attach (${STICKER_NAMES.join(', ')})`)
		.action(
			async (
				gid: string,
				text: string | undefined,
				opts: { htmlText?: string; pin?: boolean; unpin?: boolean; sticker?: string },
			) => {
				const isPinned = pinnedFromCli(opts)
				const data = await resolveStoryApi(api).updateStory(gid, {
					...(text !== undefined && { text }),
					...(opts.htmlText !== undefined && { html_text: opts.htmlText }),
					...(isPinned !== undefined && { is_pinned: isPinned }),
					...(opts.sticker !== undefined && { sticker_name: opts.sticker }),
				})
				output(data, () => fmtStory(data))
			},
		)

	cmd
		.command('delete <gid>')
		.description('Delete a comment you authored')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('story', gid, () => resolveStoryApi(api).deleteStory(gid))
			output(result, () => console.log(deleteMessage(result, 'Comment')))
		})

	return cmd
}
