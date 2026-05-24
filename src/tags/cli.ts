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
import type { TagApi } from './api.js'

type Tag = { gid: string; name: string; color?: string | null }
type Task = { gid: string; name: string; completed?: boolean; due_on?: string | null }

function fmtTag(t: Tag) {
	printFields({ Name: t.name, ID: t.gid, Color: t.color ?? null })
}

function fmtTaskList(tasks: Task[]) {
	printTable(tasks, [
		{ label: 'Name', get: (t) => t.name },
		{ label: 'ID', get: (t) => t.gid },
		{ label: 'Done', get: (t) => (t.completed ? 'yes' : 'no') },
		{ label: 'Due', get: (t) => t.due_on ?? '' },
	])
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

export function tagCommand(api?: TagApi | (() => TagApi)) {
	const cmd = new Command('tag').description('Manage Asana tags')

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
			const data = await resolveTagApi(api).listTags(
				requiredGid(opts, 'workspace', 'Workspace GID'),
				paginationOptionsFromCli(opts),
			)
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (t: Tag) => t.name },
					{ label: 'ID', get: (t: Tag) => t.gid },
					{ label: 'Color', get: (t: Tag) => t.color ?? '' },
				])
				printNextPageHint(data)
			})
		},
	)

	cmd
		.command('get <gid>')
		.description('Get a tag by GID')
		.action(async (gid: string) => {
			const data = await resolveTagApi(api).getTag(gid)
			output(data, () => fmtTag(data))
		})

	const createCmd = addGidOption(
		cmd.command('create <name>').description('Create a tag'),
		'workspace',
		'Workspace GID',
		{
			env: 'ASANA_WORKSPACE',
		},
	)
	createCmd.option('--color <color>', 'Tag color').option('--notes <text>', 'Tag notes')
	createCmd.action(
		async (name: string, opts: { workspace?: string; workspaceGid?: string; color?: string; notes?: string }) => {
			const data = await resolveTagApi(api).createTag(requiredGid(opts, 'workspace', 'Workspace GID'), name, {
				...(opts.color !== undefined && { color: opts.color }),
				...(opts.notes !== undefined && { notes: opts.notes }),
			})
			output(data, () => fmtTag(data))
		},
	)

	cmd
		.command('update <gid>')
		.description('Update a tag')
		.option('--name <name>', 'New tag name')
		.option('--color <color>', 'New tag color')
		.option('--notes <text>', 'New tag notes')
		.action(async (gid: string, opts: { name?: string; color?: string; notes?: string }) => {
			const data = await resolveTagApi(api).updateTag(gid, {
				...(opts.name !== undefined && { name: opts.name }),
				...(opts.color !== undefined && { color: opts.color }),
				...(opts.notes !== undefined && { notes: opts.notes }),
			})
			output(data, () => fmtTag(data))
		})

	cmd
		.command('delete <gid>')
		.description('Delete a tag')
		.action(async (gid: string) => {
			await resolveTagApi(api).deleteTag(gid)
			console.log(`Deleted tag ${gid}`)
		})

	const taskCmd = cmd.command('task').description('Manage task tag relationships')

	addPaginationOptions(taskCmd.command('list <task-gid>').description('List tags for a task')).action(
		async (taskGid: string, opts: { limit?: number; offset?: string; optFields?: string }) => {
			const data = await resolveTagApi(api).listTagsForTask(taskGid, paginationOptionsFromCli(opts))
			output(data, () => {
				printTable(itemsForOutput(data), [
					{ label: 'Name', get: (t: Tag) => t.name },
					{ label: 'ID', get: (t: Tag) => t.gid },
					{ label: 'Color', get: (t: Tag) => t.color ?? '' },
				])
				printNextPageHint(data)
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
			const data = await resolveTagApi(api).listTasksForTag(tagGid, paginationOptionsFromCli(opts))
			output(data, () => {
				fmtTaskList(itemsForOutput(data))
				printNextPageHint(data)
			})
		},
	)

	return cmd
}
