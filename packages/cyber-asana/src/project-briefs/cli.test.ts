import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProjectBriefApi } from './api.js'
import { projectBriefCommand } from './cli.js'

function stubApi(over: Partial<ProjectBriefApi> = {}): ProjectBriefApi {
	return {
		getProjectBrief: vi.fn(),
		createProjectBrief: vi.fn(),
		updateProjectBrief: vi.fn(),
		deleteProjectBrief: vi.fn(),
		...over,
	} as ProjectBriefApi
}

function printed(spy: { mock: { calls: unknown[][] } }) {
	return spy.mock.calls.map((c) => String(c[0])).join('\n')
}

describe('project-briefs/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	it('project-brief get prints the brief', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getProjectBrief = vi.fn().mockResolvedValue({ gid: 'b1', title: 'Charter', text: 'Ship it' })
		const program = new Command().addCommand(projectBriefCommand(stubApi({ getProjectBrief })))

		await program.parseAsync(['node', 'test', 'project-brief', 'get', 'b1', '--opt-fields', 'gid,title,text'], {
			from: 'node',
		})

		expect(getProjectBrief).toHaveBeenCalledWith('b1', { optFields: 'gid,title,text' })
		expect(printed(log)).toContain('Charter')
	})

	it('project-brief create sends title, plain text and html', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const createProjectBrief = vi.fn().mockResolvedValue({ gid: 'b1', title: 'Charter' })
		const program = new Command().addCommand(projectBriefCommand(stubApi({ createProjectBrief })))

		await program.parseAsync(
			[
				'node',
				'test',
				'project-brief',
				'create',
				'--project-gid',
				'p1',
				'--title',
				'Charter',
				'--html-text',
				'<body>x</body>',
			],
			{ from: 'node' },
		)

		expect(createProjectBrief).toHaveBeenCalledWith('p1', { title: 'Charter', html_text: '<body>x</body>' })
		expect(printed(log)).toContain('b1')
	})

	it('project-brief update sends only the given fields and needs at least one', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const updateProjectBrief = vi.fn().mockResolvedValue({ gid: 'b1' })
		const program = new Command().addCommand(projectBriefCommand(stubApi({ updateProjectBrief })))

		await program.parseAsync(['node', 'test', 'project-brief', 'update', 'b1', '--text', 'New goal'], { from: 'node' })
		expect(updateProjectBrief).toHaveBeenCalledWith('b1', { text: 'New goal' })

		await expect(
			new Command()
				.addCommand(projectBriefCommand(stubApi({ updateProjectBrief })))
				.parseAsync(['node', 'test', 'project-brief', 'update', 'b1'], { from: 'node' }),
		).rejects.toThrow(/at least one/)
		expect(updateProjectBrief).toHaveBeenCalledTimes(1)
	})

	it('project-brief delete is idempotent', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const deleteProjectBrief = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const program = new Command().addCommand(projectBriefCommand(stubApi({ deleteProjectBrief })))

		await program.parseAsync(['node', 'test', 'project-brief', 'delete', 'b1'], { from: 'node' })
		await program.parseAsync(['node', 'test', 'project-brief', 'delete', 'b1'], { from: 'node' })

		const text = printed(log)
		expect(text).toContain('Deleted project brief b1')
		expect(text).toContain('already deleted')
	})
})
