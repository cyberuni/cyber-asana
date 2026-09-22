import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getJobMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return { ...actual, getJob: getJobMock }
})

const { jobCommand } = await import('./cli.js')

function jobApiStub() {
	return { getJob: vi.fn(), waitForJobCompletion: vi.fn() }
}

describe('jobs/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
		vi.restoreAllMocks()
	})

	it('job get prints the job status and the resource it produced', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getJob = vi.fn().mockResolvedValue({
			gid: 'job1',
			resource_subtype: 'project_template_instantiate_project',
			status: 'succeeded',
			new_project: { gid: 'proj1', name: 'Client onboarding' },
		})
		const program = new Command().addCommand(jobCommand({ ...jobApiStub(), getJob }))

		await program.parseAsync(['node', 'test', 'job', 'get', 'job1'], { from: 'node' })

		expect(getJob).toHaveBeenCalledWith('job1', undefined)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('succeeded'))).toBe(true)
		expect(lines.some((l) => l.includes('proj1'))).toBe(true)
	})

	it('job get suggests the command matching the resource the job produced', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getJob = vi.fn().mockResolvedValue({
			gid: 'job1',
			resource_subtype: 'duplicate_task',
			status: 'succeeded',
			new_task: { gid: 'task1' },
		})
		const program = new Command().addCommand(jobCommand({ ...jobApiStub(), getJob }))

		await program.parseAsync(['node', 'test', 'job', 'get', 'job1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('cyber-asana task get task1'))).toBe(true)
	})

	it('job get tells an unfinished job to poll again', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getJob = vi.fn().mockResolvedValue({ gid: 'job1', status: 'in_progress' })
		const program = new Command().addCommand(jobCommand({ ...jobApiStub(), getJob }))

		await program.parseAsync(['node', 'test', 'job', 'get', 'job1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('cyber-asana job get job1'))).toBe(true)
	})

	it('job get falls back to the default api when none is injected', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		getJobMock.mockResolvedValue({ gid: 'job1', status: 'in_progress' })
		const program = new Command().addCommand(jobCommand())

		await program.parseAsync(['node', 'test', 'job', 'get', 'job1'], { from: 'node' })

		expect(getJobMock).toHaveBeenCalledWith('job1', undefined)
	})
})
