import { Command } from 'commander'
import { addReadOptions, readOptionsFromCli } from '../cli-options.js'
import type { Job } from '../job-polling.js'
import { output, printFields, printNextSteps } from '../output.js'
import type { JobApi } from './api.js'
import { getJob } from './api.js'

function resolveJobApi(api?: JobApi | (() => JobApi)): JobApi {
	if (typeof api === 'function') return api()
	return api ?? { getJob }
}

/** The resource an async job produces, whichever kind of job it is. */
function jobResult(job: Job): { label: string; gid: string; command: string } | undefined {
	type Produced = { gid?: string } | null | undefined
	const candidates: [string, string, Produced][] = [
		['New project', 'project get', job.new_project as Produced],
		['New task', 'task get', job.new_task as Produced],
		['New project template', 'project-template get', job.new_project_template as Produced],
	]
	for (const [label, command, resource] of candidates) {
		if (resource?.gid) return { label, gid: resource.gid, command }
	}
	return undefined
}

function fmtJob(job: Job) {
	const result = jobResult(job)
	printFields({
		ID: job.gid ?? null,
		Status: job.status ?? null,
		Type: (job.resource_subtype as string | undefined) ?? null,
		...(result ? { [result.label]: result.gid } : {}),
	})
}

export function jobCommand(api?: JobApi | (() => JobApi)) {
	const cmd = new Command('job').description('Inspect Asana async jobs')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana job get <gid>',
			'',
			'Asana returns a job for operations it runs asynchronously, such as',
			'`project-template instantiate --no-wait`. Poll the job until its status',
			'is `succeeded` or `failed`.',
		].join('\n'),
	)

	addReadOptions(cmd.command('get <gid>').description('Get an async job by GID')).action(
		async (gid: string, opts: { optFields?: string }) => {
			const data = await resolveJobApi(api).getJob(gid, readOptionsFromCli(opts))
			output(data, () => {
				fmtJob(data)
				const result = jobResult(data)
				printNextSteps(
					result
						? [`cyber-asana ${result.command} ${result.gid} — view what the job produced`]
						: [`cyber-asana job get ${gid} — poll again until the status is succeeded or failed`],
				)
			})
		},
	)

	return cmd
}
