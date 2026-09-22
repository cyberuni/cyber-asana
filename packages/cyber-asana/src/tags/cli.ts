import { Command } from 'commander'
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
import type { TagApi } from './api.js'
import {
	addTagToTask,
	createTag,
	deleteTag,
	getTag,
	listTags,
	listTagsForTask,
	listTasksForTag,
	removeTagFromTask,
	updateTag,
} from './api.js'
import { buildTagUpdateFields, parseFollowerGids } from './write-options.js'

type Tag = { gid: string; name: string; color?: string | null }
type Task = { gid: string; name: string; completed?: boolean; due_on?: string | null }

function fmtTag(t: Tag) {
	printFields({ Name: t.name, ID: t.gid, Color: t.color ?? null })
}

function fmtTaskList(tasks: Task[]) {
	printTable(
		tasks,
		[
			{ label: 'Name', get: (t) => t.name },
			{ label: 'ID', get: (t) => t.gid },
			{ label: 'Done', get: (t) => (t.completed ? 'yes' : 'no') },
			{ label: 'Due', get: (t) => t.due_on ?? '' },
		],
		{ entity: 'tasks' },
	)
}

function resolveTagApi(api?: TagApi | (() => TagApi)): TagApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listTags,
			getTag,
			createTag,
			updateTag,
			deleteTag,
			listTagsForTask,
			listTasksForTag,
			addTagToTask,
			removeTagFromTask,
		}
	)
}

// Minimal default schemas — principle 2. Just the fields the tables render.
const TAG_LIST_FIELDS = 'gid,name,color'
const TAGGED_TASK_LIST_FIELDS = 'gid,name,completed,due_on'

const TAG_LIST_NEXT_STEPS = [
	'cyber-asana tag tasks <gid> — list the tasks carrying a tag',
	'cyber-asana tag get <gid> — view a tag',
]

export function tagCommand(api?: TagApi | (() => TagApi)) {
	const cmd = new Command('tag').description('Manage Asana tags')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana tag list --workspace-gid <gid>',
			'  cyber-asana tag get <gid> --toon',
			'  cyber-asana tag create "Urgent" --workspace-gid <gid> --color red --follower <gid,gid>',
			'  cyber-asana tag update <gid> --name "Critical"',
			'  cyber-asana tag update <gid> --clear-color',
			'  cyber-asana tag tasks <tag-gid>',
			'  cyber-asana tag task list <task-gid>',
			'  cyber-asana tag task add <task-gid> <tag-gid>',
			'  cyber-asana tag delete <gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List tags in a workspace'), 'workspace', 'Workspace GID', {
			env: 'ASANA_WORKSPACE',
		}),
	).action(
		async (opts: {
			workspace?: string
			workspaceGid?: string
			limit?: number
			offset?: string
			optFields?: string
		}) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TAG_LIST_FIELDS
			const data = await resolveTagApi(api).listTags(requiredGid(opts, 'workspace', 'Workspace GID'), pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (t: Tag) => t.name },
						{ label: 'ID', get: (t: Tag) => t.gid },
						{ label: 'Color', get: (t: Tag) => t.color ?? '' },
					],
					{ entity: 'tags' },
				)
				printCountSummary(items.length, 'tag(s)')
				printNextPageHint(data)
				printNextSteps(TAG_LIST_NEXT_STEPS)
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a tag by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveTagApi(api).getTag(gid, readOptionsFromCli(opts))
			output(data, () => fmtTag(data))
		},
	)

	const createCmd = addGidOption(
		cmd.command('create <name>').description('Create a tag'),
		'workspace',
		'Workspace GID',
		{
			env: 'ASANA_WORKSPACE',
		},
	)
	createCmd
		.option('--color <color>', 'Tag color')
		.option('--notes <text>', 'Tag notes')
		.option('--follower <gid[,gid...]>', 'Follower user GIDs')
	createCmd.action(
		async (
			name: string,
			opts: { workspace?: string; workspaceGid?: string; color?: string; notes?: string; follower?: string },
		) => {
			const followers = parseFollowerGids(opts.follower)
			const data = await resolveTagApi(api).createTag(requiredGid(opts, 'workspace', 'Workspace GID'), name, {
				...(opts.color !== undefined && { color: opts.color }),
				...(opts.notes !== undefined && { notes: opts.notes }),
				...(followers && { followers }),
			})
			output(data, () => fmtTag(data))
		},
	)

	cmd
		.command('update <gid>')
		.description('Update a tag')
		.option('--name <name>', 'New tag name')
		.option('--color <color>', 'New tag color')
		.option('--clear-color', 'Remove the tag color')
		.option('--notes <text>', 'New tag notes')
		.action(async (gid: string, opts: { name?: string; color?: string; clearColor?: boolean; notes?: string }) => {
			const data = await resolveTagApi(api).updateTag(gid, buildTagUpdateFields(opts))
			output(data, () => fmtTag(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a tag')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('tag', gid, () => resolveTagApi(api).deleteTag(gid))
			output(result, () => console.log(deleteMessage(result, 'Tag')))
		})

	const taskCmd = cmd.command('task').description('Manage task tag relationships')

	addPaginationOptions(taskCmd.command('list <task-gid>').description('List tags for a task')).action(
		async (taskGid: string, opts: { limit?: number; offset?: string; optFields?: string }) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TAG_LIST_FIELDS
			const data = await resolveTagApi(api).listTagsForTask(taskGid, pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (t: Tag) => t.name },
						{ label: 'ID', get: (t: Tag) => t.gid },
						{ label: 'Color', get: (t: Tag) => t.color ?? '' },
					],
					{ entity: 'tags' },
				)
				printCountSummary(items.length, 'tag(s)')
				printNextPageHint(data)
				printNextSteps([`cyber-asana tag task remove ${taskGid} <tag-gid> — untag this task`])
			})
		},
	)

	taskCmd
		.command('add <task-gid> <tag-gid>')
		.description('Add a tag to a task')
		.action(async (taskGid: string, tagGid: string) => {
			const data = await resolveTagApi(api).addTagToTask(taskGid, tagGid)
			output(data, () => printFields({ Task: taskGid, Tag: tagGid, Status: 'added' }))
		})

	taskCmd
		.command('remove <task-gid> <tag-gid>')
		.description('Remove a tag from a task')
		.action(async (taskGid: string, tagGid: string) => {
			const data = await resolveTagApi(api).removeTagFromTask(taskGid, tagGid)
			output(data, () => printFields({ Task: taskGid, Tag: tagGid, Status: 'removed' }))
		})

	addPaginationOptions(cmd.command('tasks <tag-gid>').description('List tasks for a tag')).action(
		async (tagGid: string, opts: { limit?: number; offset?: string; optFields?: string }) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TAGGED_TASK_LIST_FIELDS
			const data = await resolveTagApi(api).listTasksForTag(tagGid, pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				fmtTaskList(items)
				printCountSummary(items.length, 'task(s)')
				printNextPageHint(data)
				printNextSteps(['cyber-asana task get <gid> — view a task'])
			})
		},
	)

	return cmd
}
