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
import { DEFAULT_JOB_POLL_ATTEMPTS, DEFAULT_JOB_POLL_INTERVAL_MS, type Job } from '../job-polling.js'
import { output, printCountSummary, printFields, printNextSteps, printSummary, printTable } from '../output.js'
import type { TaskTemplateApi } from './api.js'
import { getTaskTemplate, instantiateTask, listTaskTemplates } from './api.js'

type TaskTemplate = {
	gid: string
	name: string
	project?: { gid?: string; name?: string } | null
}

function resolveTaskTemplateApi(api?: TaskTemplateApi | (() => TaskTemplateApi)): TaskTemplateApi {
	if (typeof api === 'function') return api()
	return api ?? { listTaskTemplates, getTaskTemplate, instantiateTask }
}

// Minimal default schema — principle 2. Just the fields the table renders.
const TASK_TEMPLATE_LIST_FIELDS = 'gid,name'

const TASK_TEMPLATE_LIST_NEXT_STEPS = [
	'cyber-asana task-template instantiate <gid> --name "..." — create a task from a template',
	'cyber-asana task-template get <gid> — view a template',
]

function parseTimeout(value: string) {
	const seconds = Number(value)
	if (!Number.isInteger(seconds) || seconds < 1) {
		throw new InvalidArgumentError('--timeout must be a whole number of seconds greater than 0')
	}
	return seconds
}

function newTaskOf(job: Job) {
	return (job.new_task ?? undefined) as { gid?: string; name?: string } | undefined
}

export function taskTemplateCommand(api?: TaskTemplateApi | (() => TaskTemplateApi)) {
	const cmd = new Command('task-template').description('Use Asana task templates')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana task-template list --project-gid <gid>',
			'  cyber-asana task-template get <gid>',
			'  cyber-asana task-template instantiate <gid> --name "Release 1.2"',
			'  cyber-asana task-template instantiate <gid> --no-wait',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addPaginationOptions(
		addGidOption(cmd.command('list').description('List task templates in a project'), 'project', 'Project GID'),
	).action(
		async (opts: { project?: string; projectGid?: string; limit?: number; offset?: string; optFields?: string }) => {
			const pagination = paginationOptionsFromCli(opts)
			pagination.optFields ??= TASK_TEMPLATE_LIST_FIELDS
			const data = await resolveTaskTemplateApi(api).listTaskTemplates(
				requiredGid(opts, 'project', 'Project GID'),
				pagination,
			)
			output(data, () => {
				const items = itemsForOutput(data)
				printTable(
					items,
					[
						{ label: 'Name', get: (t: TaskTemplate) => t.name },
						{ label: 'ID', get: (t: TaskTemplate) => t.gid },
					],
					{ entity: 'task templates' },
				)
				printCountSummary(items.length, 'task template(s)')
				printNextPageHint(data)
				printNextSteps(TASK_TEMPLATE_LIST_NEXT_STEPS)
			})
		},
	)

	addReadOptions(cmd.command('get <gid>').description('Get a task template by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data: TaskTemplate = await resolveTaskTemplateApi(api).getTaskTemplate(gid, readOptionsFromCli(opts))
			output(data, () =>
				printFields({
					Name: data.name,
					ID: data.gid,
					Project: data.project?.name ?? data.project?.gid ?? null,
				}),
			)
		},
	)

	cmd
		.command('instantiate <gid>')
		.description('Create a task from a task template')
		.option('--name <name>', 'Name for the created task (defaults to the template name)')
		.option('--no-wait', 'Return the instantiation job without waiting for the task')
		.option(
			'--timeout <seconds>',
			`Seconds to wait for the task before returning the pending job (default: ${DEFAULT_JOB_POLL_ATTEMPTS})`,
			parseTimeout,
		)
		.action(async (gid: string, opts: { name?: string; wait: boolean; timeout?: number }) => {
			const job = await resolveTaskTemplateApi(api).instantiateTask(
				gid,
				{ ...(opts.name !== undefined && { name: opts.name }) },
				{
					maxAttempts: opts.wait ? (opts.timeout ?? DEFAULT_JOB_POLL_ATTEMPTS) : 0,
					intervalMs: DEFAULT_JOB_POLL_INTERVAL_MS,
				},
			)

			// A failed job is a failed command: agents branch on the exit code, and the
			// job GID in the message is what they need to look the failure up.
			if (job.status === 'failed') {
				throw new Error(`Task instantiation job ${job.gid} failed`)
			}

			output(job, () => {
				const task = newTaskOf(job)
				printFields({
					Task: task?.name ?? null,
					'Task ID': task?.gid ?? null,
					Job: job.gid ?? null,
					Status: job.status ?? null,
				})
				if (task?.gid) {
					printNextSteps([`cyber-asana task get ${task.gid} — view the created task`])
					return
				}
				printSummary(`Job ${job.gid} is still ${job.status}; the task is not ready yet`)
			})
		})

	return cmd
}
