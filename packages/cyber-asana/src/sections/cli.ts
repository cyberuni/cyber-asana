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
import type { SectionApi } from './api.js'
import {
	addTaskToSection,
	createSection,
	deleteSection,
	getSection,
	listSections,
	moveSection,
	updateSection,
} from './api.js'

type Section = { gid: string; name: string }

function fmtSection(s: Section) {
	printFields({ Name: s.name, ID: s.gid })
}

function resolveSectionApi(api?: SectionApi | (() => SectionApi)): SectionApi {
	if (typeof api === 'function') return api()
	return (
		api ?? {
			listSections,
			getSection,
			createSection,
			updateSection,
			deleteSection,
			moveSection,
			addTaskToSection,
		}
	)
}

// Mirrors `task project add`: the two placements name a position, so only one can win.
function assertSinglePlacement(opts: { insertBefore?: string; insertAfter?: string }) {
	if (opts.insertAfter && opts.insertBefore) {
		throw new Error('--insert-after and --insert-before are mutually exclusive')
	}
}

// Minimal default schema for section lists — principle 2.
const SECTION_LIST_FIELDS = 'gid,name'

const SECTION_LIST_NEXT_STEPS = [
	'cyber-asana section get <gid> — view a section',
	'cyber-asana task list --project-gid <gid> — list the project’s tasks',
]

export function sectionCommand(api?: SectionApi | (() => SectionApi)) {
	const cmd = new Command('section').description('Manage Asana sections')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana section list --project-gid <gid>',
			'  cyber-asana section get <gid> --toon',
			'  cyber-asana section create "In Progress" --project-gid <gid>',
			'  cyber-asana section create "Review" --project-gid <gid> --insert-after <section-gid>',
			'  cyber-asana section update <gid> --name "Done"',
			'  cyber-asana section move <gid> --project-gid <gid> --insert-after <section-gid>',
			'  cyber-asana section task add <section-gid> <task-gid> --insert-before <task-gid>',
			'  cyber-asana section delete <gid>',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List sections in a project'), 'project', 'Project GID'),
	).action(
		async (opts: { project?: string; projectGid?: string; limit?: number; offset?: string; optFields?: string }) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= SECTION_LIST_FIELDS
			const data = await resolveSectionApi(api).listSections(requiredGid(opts, 'project', 'Project GID'), pagination)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (s: Section) => s.name },
						{ label: 'ID', get: (s: Section) => s.gid },
					],
					{ entity: 'sections' },
				)
				printCountSummary(items.length, 'section(s)')
				printNextPageHint(data)
				printNextSteps(SECTION_LIST_NEXT_STEPS)
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a section by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveSectionApi(api).getSection(gid, readOptionsFromCli(opts))
			output(data, () => fmtSection(data))
		},
	)

	addGidOption(
		cmd
			.command('create <name>')
			.description('Create a section in a project')
			.option('--insert-before <gid>', 'Insert before this section GID')
			.option('--insert-after <gid>', 'Insert after this section GID'),
		'project',
		'Project GID',
	).action(
		async (
			name: string,
			opts: { project?: string; projectGid?: string; insertBefore?: string; insertAfter?: string },
		) => {
			assertSinglePlacement(opts)
			const data = await resolveSectionApi(api).createSection(requiredGid(opts, 'project', 'Project GID'), name, {
				insertBefore: opts.insertBefore,
				insertAfter: opts.insertAfter,
			})
			output(data, () => fmtSection(data))
		},
	)

	cmd
		.command('update <gid>')
		.description('Update a section')
		.requiredOption('--name <name>', 'New name')
		.action(async (gid: string, opts: { name: string }) => {
			const data = await resolveSectionApi(api).updateSection(gid, opts.name)
			output(data, () => fmtSection(data))
		})

	addGidOption(
		cmd
			.command('move <gid>')
			.description('Move a section before or after another section in the same project')
			.option('--insert-before <gid>', 'Insert before this section GID')
			.option('--insert-after <gid>', 'Insert after this section GID'),
		'project',
		'Project GID',
	).action(
		async (
			gid: string,
			opts: { project?: string; projectGid?: string; insertBefore?: string; insertAfter?: string },
		) => {
			assertSinglePlacement(opts)
			if (!opts.insertBefore && !opts.insertAfter) {
				throw new Error('one of --insert-before or --insert-after is required')
			}
			const projectGid = requiredGid(opts, 'project', 'Project GID')
			await resolveSectionApi(api).moveSection(projectGid, gid, {
				insertBefore: opts.insertBefore,
				insertAfter: opts.insertAfter,
			})
			output({ section: gid, project: projectGid, status: 'moved' }, () =>
				console.log(`Moved section ${gid} in project ${projectGid}`),
			)
		},
	)

	const taskCmd = cmd.command('task').description('Manage the tasks in a section')

	taskCmd
		.command('add <section-gid> <task-gid>')
		.description('Add a task directly to a section')
		.option('--insert-before <gid>', 'Insert before this task GID')
		.option('--insert-after <gid>', 'Insert after this task GID')
		.action(async (sectionGid: string, taskGid: string, opts: { insertBefore?: string; insertAfter?: string }) => {
			assertSinglePlacement(opts)
			await resolveSectionApi(api).addTaskToSection(sectionGid, taskGid, {
				insertBefore: opts.insertBefore,
				insertAfter: opts.insertAfter,
			})
			output({ task: taskGid, section: sectionGid, status: 'added' }, () =>
				console.log(`Added task ${taskGid} to section ${sectionGid}`),
			)
		})

	cmd
		.command('delete <gid>')
		.description('Delete a section')
		.action(async (gid: string) => {
			const result = await deleteIdempotently('section', gid, () => resolveSectionApi(api).deleteSection(gid))
			output(result, () => console.log(deleteMessage(result, 'Section')))
		})

	return cmd
}
