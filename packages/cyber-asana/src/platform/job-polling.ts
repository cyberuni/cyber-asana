// Asana answers "instantiate this template" with a job rather than the record it
// will create. Polling that job is the only way to hand a caller the finished
// thing, so the loop lives here — resource-agnostic — instead of inside one domain.

export type Job = { gid?: string; status?: string; [key: string]: unknown }

export type WaitForJobOptions = {
	/** How many times to re-read the job before giving up. */
	maxAttempts?: number
	/** Delay between reads, in milliseconds. */
	intervalMs?: number
	/** Injectable for tests; defaults to a real timer. */
	sleep?: (ms: number) => Promise<void>
}

export const DEFAULT_JOB_POLL_ATTEMPTS = 10
export const DEFAULT_JOB_POLL_INTERVAL_MS = 1000

const FINISHED = new Set(['succeeded', 'failed'])

export function isJobFinished(job: Job): boolean {
	return job.status !== undefined && FINISHED.has(job.status)
}

function defaultSleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

/**
 * Poll a job until it finishes. Returns the last job record seen — a caller that
 * ran out of attempts still gets a `status` it can act on, rather than an error.
 */
export async function waitForJob(job: Job, getJob: (jobGid: string) => Promise<Job>, opts?: WaitForJobOptions) {
	const maxAttempts = opts?.maxAttempts ?? DEFAULT_JOB_POLL_ATTEMPTS
	const intervalMs = opts?.intervalMs ?? DEFAULT_JOB_POLL_INTERVAL_MS
	const sleep = opts?.sleep ?? defaultSleep

	const gid = job.gid
	if (gid === undefined) return job

	let latest = job
	for (let attempt = 0; attempt < maxAttempts && !isJobFinished(latest); attempt++) {
		await sleep(intervalMs)
		latest = await getJob(gid)
	}
	return latest
}

export class JobFailedError extends Error {
	readonly jobGid: string
	readonly status: string | undefined
	readonly job: Job

	constructor(job: Job) {
		const gid = job.gid ?? 'unknown'
		super(
			isJobFinished(job)
				? `Asana job ${gid} failed.`
				: `Asana job ${gid} is still ${job.status ?? 'unknown'}; the wait ran out before it finished. Check it with: cyber-asana job get ${gid}`,
		)
		this.name = 'JobFailedError'
		this.jobGid = gid
		this.status = job.status
		this.job = job
	}
}

/**
 * Guard the honest reading of a polled job: only `succeeded` produced a resource,
 * so a failed job and a wait that expired both raise instead of reading as success.
 */
export function assertJobSucceeded(job: Job): Job {
	if (job.status !== 'succeeded') throw new JobFailedError(job)
	return job
}
