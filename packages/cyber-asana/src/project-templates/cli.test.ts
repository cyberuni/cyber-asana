import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listProjectTemplatesMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return { ...actual, listProjectTemplates: listProjectTemplatesMock }
})

const { projectTemplateCommand } = await import('./cli.js')

function templateApiStub() {
	return {
		listProjectTemplates: vi.fn(),
		listProjectTemplatesForTeam: vi.fn(),
		getProjectTemplate: vi.fn(),
		instantiateProject: vi.fn(),
		instantiateProjectAndWait: vi.fn(),
	}
}

function exitOverriding(cmd: Command) {
	cmd.exitOverride()
	for (const sub of cmd.commands) sub.exitOverride()
	return cmd
}

const succeededJob = {
	gid: 'job1',
	status: 'succeeded',
	new_project: { gid: 'proj1', name: 'Acme onboarding' },
}

describe('project-templates/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	it('list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listProjectTemplates = vi.fn().mockResolvedValue([{ gid: 'tpl1', name: 'Client onboarding' }])
		const program = new Command().addCommand(projectTemplateCommand({ ...templateApiStub(), listProjectTemplates }))

		await program.parseAsync(['node', 'test', 'project-template', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listProjectTemplates).toHaveBeenCalledWith(
			{ workspace: 'ws1' },
			expect.objectContaining({ optFields: 'gid,name,team.name' }),
		)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 project template(s)')
		expect(lines.some((l) => l.includes('cyber-asana project-template get <gid>'))).toBe(true)
	})

	it('list uses the team-scoped endpoint when a team is given', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = templateApiStub()
		api.listProjectTemplatesForTeam = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(projectTemplateCommand(api))

		await program.parseAsync(['node', 'test', 'project-template', 'list', '--team-gid', 'team1'], { from: 'node' })

		expect(api.listProjectTemplatesForTeam).toHaveBeenCalledWith('team1', expect.anything())
		expect(api.listProjectTemplates).not.toHaveBeenCalled()
	})

	it('get prints the template and the date variables instantiation needs', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getProjectTemplate = vi.fn().mockResolvedValue({
			gid: 'tpl1',
			name: 'Client onboarding',
			team: { gid: 'team1', name: 'Ops' },
			requested_dates: [{ gid: 'date1', name: 'Kickoff' }],
		})
		const program = new Command().addCommand(projectTemplateCommand({ ...templateApiStub(), getProjectTemplate }))

		await program.parseAsync(['node', 'test', 'project-template', 'get', 'tpl1'], { from: 'node' })

		expect(getProjectTemplate).toHaveBeenCalledWith('tpl1', undefined)
		const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('Client onboarding')
		expect(logged).toContain('date1')
		expect(logged).toContain('Kickoff')
	})

	it('instantiate waits by default and prints the new project GID', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = templateApiStub()
		api.instantiateProjectAndWait = vi.fn().mockResolvedValue(succeededJob)
		const program = new Command().addCommand(projectTemplateCommand(api))

		await program.parseAsync(
			[
				'node',
				'test',
				'project-template',
				'instantiate',
				'tpl1',
				'--name',
				'Acme onboarding',
				'--team-gid',
				'team1',
				'--public',
				'--requested-date',
				'date1=2026-09-01',
			],
			{ from: 'node' },
		)

		expect(api.instantiateProjectAndWait).toHaveBeenCalledWith(
			'tpl1',
			{
				name: 'Acme onboarding',
				team: 'team1',
				public: true,
				requestedDates: [{ gid: 'date1', value: '2026-09-01' }],
			},
			{ maxAttempts: 60, intervalMs: 1000 },
		)
		const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('proj1')
		expect(logged).toContain('cyber-asana project get proj1')
	})

	it('instantiate honours --timeout in seconds', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = templateApiStub()
		api.instantiateProjectAndWait = vi.fn().mockResolvedValue(succeededJob)
		const program = new Command().addCommand(projectTemplateCommand(api))

		await program.parseAsync(
			['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme', '--timeout', '5'],
			{ from: 'node' },
		)

		expect(api.instantiateProjectAndWait).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme' },
			{ maxAttempts: 5, intervalMs: 1000 },
		)
	})

	it('instantiate --no-wait returns the job without polling', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = templateApiStub()
		api.instantiateProject = vi.fn().mockResolvedValue({ gid: 'job1', status: 'not_started' })
		const program = new Command().addCommand(projectTemplateCommand(api))

		await program.parseAsync(
			['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme', '--no-wait'],
			{ from: 'node' },
		)

		expect(api.instantiateProject).toHaveBeenCalledWith('tpl1', { name: 'Acme' })
		expect(api.instantiateProjectAndWait).not.toHaveBeenCalled()
		const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('job1')
		expect(logged).toContain('cyber-asana job get job1')
	})

	it('instantiate rejects --public together with --private', async () => {
		const api = templateApiStub()
		const program = new Command().addCommand(exitOverriding(projectTemplateCommand(api)))

		await expect(
			program.parseAsync(
				['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme', '--public', '--private'],
				{ from: 'node' },
			),
		).rejects.toThrow(/--public/)
		expect(api.instantiateProjectAndWait).not.toHaveBeenCalled()
	})

	it('instantiate rejects a --requested-date without a value', async () => {
		const api = templateApiStub()
		const program = new Command().addCommand(exitOverriding(projectTemplateCommand(api)))

		await expect(
			program.parseAsync(
				['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme', '--requested-date', 'date1'],
				{ from: 'node' },
			),
		).rejects.toThrow(/requested-date/)
		expect(api.instantiateProjectAndWait).not.toHaveBeenCalled()
	})

	it('falls back to the default api when none is injected', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		listProjectTemplatesMock.mockResolvedValue([])
		const program = new Command().addCommand(projectTemplateCommand())

		await program.parseAsync(['node', 'test', 'project-template', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listProjectTemplatesMock).toHaveBeenCalled()
	})

	it('instantiate carries --privacy-setting into the instantiation fields', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = templateApiStub()
		api.instantiateProjectAndWait = vi.fn().mockResolvedValue(succeededJob)
		const program = new Command().addCommand(projectTemplateCommand(api))

		await program.parseAsync(
			['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme', '--privacy-setting', 'private'],
			{ from: 'node' },
		)

		expect(api.instantiateProjectAndWait).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme', privacySetting: 'private' },
			expect.anything(),
		)
	})

	it('instantiate rejects --privacy-setting alongside --public', async () => {
		const api = templateApiStub()
		const program = exitOverriding(new Command().addCommand(projectTemplateCommand(api)))

		await expect(
			program.parseAsync(
				[
					'node',
					'test',
					'project-template',
					'instantiate',
					'tpl1',
					'--name',
					'Acme',
					'--public',
					'--privacy-setting',
					'private',
				],
				{ from: 'node' },
			),
		).rejects.toThrow(/privacy-setting/)
		expect(api.instantiateProjectAndWait).not.toHaveBeenCalled()
	})

	it('instantiate carries --strict-dates into the instantiation fields', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = templateApiStub()
		api.instantiateProjectAndWait = vi.fn().mockResolvedValue(succeededJob)
		const program = new Command().addCommand(projectTemplateCommand(api))

		await program.parseAsync(
			['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme', '--strict-dates'],
			{ from: 'node' },
		)

		expect(api.instantiateProjectAndWait).toHaveBeenCalledWith(
			'tpl1',
			{ name: 'Acme', isStrict: true },
			expect.anything(),
		)
	})

	it('instantiate collects repeated --requested-role pairs', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = templateApiStub()
		api.instantiateProjectAndWait = vi.fn().mockResolvedValue(succeededJob)
		const program = new Command().addCommand(projectTemplateCommand(api))

		await program.parseAsync(
			[
				'node',
				'test',
				'project-template',
				'instantiate',
				'tpl1',
				'--name',
				'Acme',
				'--requested-role',
				'role1=me',
				'--requested-role',
				'role2=potter@nettlefold.test',
			],
			{ from: 'node' },
		)

		expect(api.instantiateProjectAndWait).toHaveBeenCalledWith(
			'tpl1',
			{
				name: 'Acme',
				requestedRoles: [
					{ gid: 'role1', value: 'me' },
					{ gid: 'role2', value: 'potter@nettlefold.test' },
				],
			},
			expect.anything(),
		)
	})

	it('instantiate rejects a --requested-role without a value', async () => {
		const api = templateApiStub()
		const program = new Command().addCommand(exitOverriding(projectTemplateCommand(api)))

		await expect(
			program.parseAsync(
				['node', 'test', 'project-template', 'instantiate', 'tpl1', '--name', 'Acme', '--requested-role', 'role1'],
				{ from: 'node' },
			),
		).rejects.toThrow(/--requested-role must be <template-role-gid>=<user>/)
		expect(api.instantiateProjectAndWait).not.toHaveBeenCalled()
	})
})
