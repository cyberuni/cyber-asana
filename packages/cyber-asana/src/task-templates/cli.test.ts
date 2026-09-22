import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { taskTemplateCommand } from './cli.js'

function taskTemplateApiStub() {
	return {
		listTaskTemplates: vi.fn(),
		getTaskTemplate: vi.fn(),
		instantiateTask: vi.fn(),
	}
}

function run(api: ReturnType<typeof taskTemplateApiStub>, argv: string[]) {
	const program = new Command().addCommand(taskTemplateCommand(api))
	return program.parseAsync(['node', 'test', 'task-template', ...argv], { from: 'node' })
}

describe('task-templates/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = taskTemplateApiStub()
		api.listTaskTemplates.mockResolvedValue([{ gid: 'tt1', name: 'Release checklist' }])

		await run(api, ['list', '--project-gid', 'p1'])

		expect(api.listTaskTemplates).toHaveBeenCalledWith('p1', expect.objectContaining({ optFields: 'gid,name' }))
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 task template(s)')
		expect(lines.some((l) => l.includes('cyber-asana task-template instantiate <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('list names the entity when a project has no templates', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = taskTemplateApiStub()
		api.listTaskTemplates.mockResolvedValue([])

		await run(api, ['list', '--project-gid', 'p1'])

		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('0 task templates found')
		logSpy.mockRestore()
	})

	it('list requires a project GID', async () => {
		const api = taskTemplateApiStub()

		await expect(run(api, ['list'])).rejects.toThrow(/Project GID/)
		expect(api.listTaskTemplates).not.toHaveBeenCalled()
	})

	it('get prints the template fields', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = taskTemplateApiStub()
		api.getTaskTemplate.mockResolvedValue({
			gid: 'tt1',
			name: 'Release checklist',
			project: { gid: 'p1', name: 'Platform' },
		})

		await run(api, ['get', 'tt1'])

		expect(api.getTaskTemplate).toHaveBeenCalledWith('tt1', undefined)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Release checklist'))).toBe(true)
		expect(lines.some((l) => l.includes('Platform'))).toBe(true)
		logSpy.mockRestore()
	})

	it('instantiate waits for the job and reports the created task', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = taskTemplateApiStub()
		api.instantiateTask.mockResolvedValue({
			gid: 'j1',
			status: 'succeeded',
			new_task: { gid: 't1', name: 'Release 1.2' },
		})

		await run(api, ['instantiate', 'tt1', '--name', 'Release 1.2'])

		expect(api.instantiateTask).toHaveBeenCalledWith(
			'tt1',
			{ name: 'Release 1.2' },
			expect.objectContaining({ maxAttempts: expect.any(Number) }),
		)
		expect(api.instantiateTask.mock.calls[0]![2].maxAttempts).toBeGreaterThan(0)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('t1'))).toBe(true)
		expect(lines.some((l) => l.includes('cyber-asana task get t1'))).toBe(true)
		logSpy.mockRestore()
	})

	it('instantiate sends no name when none is given', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = taskTemplateApiStub()
		api.instantiateTask.mockResolvedValue({ gid: 'j1', status: 'succeeded', new_task: { gid: 't1' } })

		await run(api, ['instantiate', 'tt1'])

		expect(api.instantiateTask.mock.calls[0]![1]).toEqual({})
		vi.restoreAllMocks()
	})

	it('instantiate --no-wait returns the job without polling', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = taskTemplateApiStub()
		api.instantiateTask.mockResolvedValue({ gid: 'j1', status: 'in_progress' })

		await run(api, ['instantiate', 'tt1', '--no-wait'])

		expect(api.instantiateTask.mock.calls[0]![2].maxAttempts).toBe(0)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('in_progress'))).toBe(true)
		logSpy.mockRestore()
	})

	it('instantiate --timeout bounds how long the job is polled', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = taskTemplateApiStub()
		api.instantiateTask.mockResolvedValue({ gid: 'j1', status: 'succeeded', new_task: { gid: 't1' } })

		await run(api, ['instantiate', 'tt1', '--timeout', '3'])

		expect(api.instantiateTask.mock.calls[0]![2]).toEqual({ maxAttempts: 3, intervalMs: 1000 })
		vi.restoreAllMocks()
	})

	it('instantiate rejects a timeout that is not a positive number', async () => {
		const api = taskTemplateApiStub()
		const written: string[] = []
		vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
			written.push(String(chunk))
			return true
		})
		vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
			throw new Error(`exit ${code}`)
		}) as never)

		await expect(run(api, ['instantiate', 'tt1', '--timeout', 'soon'])).rejects.toThrow(/exit 1/)
		expect(written.join('')).toMatch(/timeout/i)
		expect(api.instantiateTask).not.toHaveBeenCalled()
		vi.restoreAllMocks()
	})

	it('instantiate fails when the job failed', async () => {
		const api = taskTemplateApiStub()
		api.instantiateTask.mockResolvedValue({ gid: 'j1', status: 'failed' })

		await expect(run(api, ['instantiate', 'tt1'])).rejects.toThrow(/j1/)
	})

	it('instantiate emits the job record in JSON mode', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const api = taskTemplateApiStub()
		const job = { gid: 'j1', status: 'succeeded', new_task: { gid: 't1', name: 'Release 1.2' } }
		api.instantiateTask.mockResolvedValue(job)

		await run(api, ['instantiate', 'tt1'])

		expect(JSON.parse(String(logSpy.mock.calls[0]![0]))).toEqual(job)
		logSpy.mockRestore()
	})
})
