import { describe, expect, it, vi } from 'vitest'
import { assertJobSucceeded, isJobFinished, JobFailedError, waitForJob } from './job-polling.js'

const noSleep = () => Promise.resolve()

describe('isJobFinished', () => {
	it('treats succeeded and failed as finished', () => {
		expect(isJobFinished({ status: 'succeeded' })).toBe(true)
		expect(isJobFinished({ status: 'failed' })).toBe(true)
	})

	it('treats a job still running as unfinished', () => {
		expect(isJobFinished({ status: 'not_started' })).toBe(false)
		expect(isJobFinished({ status: 'in_progress' })).toBe(false)
		expect(isJobFinished({})).toBe(false)
	})
})

describe('waitForJob', () => {
	it('returns a job that already finished without polling', async () => {
		const getJob = vi.fn()
		const job = { gid: 'j1', status: 'succeeded' }

		await expect(waitForJob(job, getJob, { sleep: noSleep })).resolves.toEqual(job)
		expect(getJob).not.toHaveBeenCalled()
	})

	it('polls until the job finishes', async () => {
		const getJob = vi
			.fn()
			.mockResolvedValueOnce({ gid: 'j1', status: 'in_progress' })
			.mockResolvedValueOnce({ gid: 'j1', status: 'succeeded', new_task: { gid: 't1' } })

		const result = await waitForJob({ gid: 'j1', status: 'not_started' }, getJob, { sleep: noSleep })

		expect(result).toEqual({ gid: 'j1', status: 'succeeded', new_task: { gid: 't1' } })
		expect(getJob).toHaveBeenCalledTimes(2)
		expect(getJob).toHaveBeenCalledWith('j1')
	})

	it('waits the poll interval between attempts', async () => {
		const sleep = vi.fn().mockResolvedValue(undefined)
		const getJob = vi.fn().mockResolvedValue({ gid: 'j1', status: 'succeeded' })

		await waitForJob({ gid: 'j1', status: 'in_progress' }, getJob, { intervalMs: 250, sleep })

		expect(sleep).toHaveBeenCalledWith(250)
	})

	it('gives up after the attempt budget and returns the last job seen', async () => {
		const getJob = vi.fn().mockResolvedValue({ gid: 'j1', status: 'in_progress' })

		const result = await waitForJob({ gid: 'j1', status: 'not_started' }, getJob, {
			maxAttempts: 3,
			sleep: noSleep,
		})

		expect(result).toEqual({ gid: 'j1', status: 'in_progress' })
		expect(getJob).toHaveBeenCalledTimes(3)
	})

	it('does not poll at all when no attempts are allowed', async () => {
		const getJob = vi.fn()
		const job = { gid: 'j1', status: 'in_progress' }

		await expect(waitForJob(job, getJob, { maxAttempts: 0, sleep: noSleep })).resolves.toEqual(job)
		expect(getJob).not.toHaveBeenCalled()
	})

	it('returns the job unchanged when it carries no gid to poll', async () => {
		const getJob = vi.fn()

		await expect(waitForJob({ status: 'in_progress' }, getJob, { sleep: noSleep })).resolves.toEqual({
			status: 'in_progress',
		})
		expect(getJob).not.toHaveBeenCalled()
	})

	it('assertJobSucceeded returns a succeeded job unchanged', () => {
		const job = { gid: 'j1', status: 'succeeded' }

		expect(assertJobSucceeded(job)).toBe(job)
	})

	it('assertJobSucceeded throws on a failed job, naming it', () => {
		let thrown: unknown
		try {
			assertJobSucceeded({ gid: 'j1', status: 'failed' })
		} catch (error) {
			thrown = error
		}

		expect(thrown).toBeInstanceOf(JobFailedError)
		expect((thrown as JobFailedError).jobGid).toBe('j1')
		expect((thrown as JobFailedError).status).toBe('failed')
		expect((thrown as JobFailedError).message).toContain('j1')
	})

	it('assertJobSucceeded throws on a job that never finished, pointing at job get', () => {
		let thrown: unknown
		try {
			assertJobSucceeded({ gid: 'j1', status: 'in_progress' })
		} catch (error) {
			thrown = error
		}

		expect(thrown).toBeInstanceOf(JobFailedError)
		expect((thrown as JobFailedError).message).toContain('cyber-asana job get j1')
	})
})
