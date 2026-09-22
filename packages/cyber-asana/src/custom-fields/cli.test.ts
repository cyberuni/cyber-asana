import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listCustomFieldsMock = vi.fn()
const getCustomFieldMock = vi.fn()
const listForProjectMock = vi.fn()
const listForPortfolioMock = vi.fn()
const listForGoalMock = vi.fn()
const listForTeamMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listCustomFields: listCustomFieldsMock,
		getCustomField: getCustomFieldMock,
		listCustomFieldSettingsForProject: listForProjectMock,
		listCustomFieldSettingsForPortfolio: listForPortfolioMock,
		listCustomFieldSettingsForGoal: listForGoalMock,
		listCustomFieldSettingsForTeam: listForTeamMock,
	}
})

const { customFieldCommand } = await import('./cli.js')

describe('custom-fields/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('custom-field list forwards workspace gid and pagination options', async () => {
		listCustomFieldsMock.mockResolvedValue({
			data: [{ gid: 'cf1', name: 'Priority', resource_subtype: 'enum' }],
			next_page: null,
			limit: 100,
		})
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(
			['node', 'test', 'custom-field', 'list', '--workspace-gid', 'ws1', '--limit', '50', '--opt-fields', 'gid,name'],
			{ from: 'node' },
		)

		expect(listCustomFieldsMock).toHaveBeenCalledWith('ws1', {
			limit: 50,
			optFields: 'gid,name',
		})
	})

	it('custom-field list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listCustomFieldsMock.mockResolvedValue([{ gid: 'cf1', name: 'Priority', resource_subtype: 'enum' }])
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', 'custom-field', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listCustomFieldsMock).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ optFields: 'gid,name,resource_subtype' }),
		)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 custom field(s)')
		expect(lines.some((l) => l.includes('cyber-asana custom-field get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('custom-field list names the entity when nothing comes back', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listCustomFieldsMock.mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', 'custom-field', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('0 custom fields found'))).toBe(true)
		logSpy.mockRestore()
	})

	it('custom-field get forwards gid and prints the enum options with their GIDs', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		getCustomFieldMock.mockResolvedValue({
			gid: 'cf1',
			name: 'Priority',
			resource_subtype: 'enum',
			enum_options: [
				{ gid: 'opt1', name: 'High', enabled: true },
				{ gid: 'opt2', name: 'Low', enabled: false },
			],
		})
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', 'custom-field', 'get', 'cf1'], { from: 'node' })

		expect(getCustomFieldMock).toHaveBeenCalledWith('cf1', undefined)
		const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('Priority')
		expect(logged).toContain('enum')
		expect(logged).toContain('opt1')
		expect(logged).toContain('High')
		logSpy.mockRestore()
	})

	it('custom-field get names the entity when a field has no enum options', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		getCustomFieldMock.mockResolvedValue({ gid: 'cf2', name: 'Estimate', resource_subtype: 'number' })
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', 'custom-field', 'get', 'cf2'], { from: 'node' })

		const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('0 enum options found')
		logSpy.mockRestore()
	})

	it('custom-field command can use injected dependencies', async () => {
		const injectedGetCustomField = vi.fn().mockResolvedValue({ gid: 'cf1', name: 'Priority' })
		const program = new Command().addCommand(
			customFieldCommand({
				listCustomFields: vi.fn(),
				getCustomField: injectedGetCustomField,
				listCustomFieldSettingsForProject: vi.fn(),
				listCustomFieldSettingsForPortfolio: vi.fn(),
				listCustomFieldSettingsForGoal: vi.fn(),
				listCustomFieldSettingsForTeam: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'custom-field', 'get', 'cf1'], { from: 'node' })

		expect(injectedGetCustomField).toHaveBeenCalledWith('cf1', undefined)
	})
})

function settingsApiStub() {
	return {
		listCustomFields: vi.fn(),
		getCustomField: vi.fn(),
		listCustomFieldSettingsForProject: vi.fn(),
		listCustomFieldSettingsForPortfolio: vi.fn(),
		listCustomFieldSettingsForGoal: vi.fn(),
		listCustomFieldSettingsForTeam: vi.fn(),
	}
}

const SETTINGS_DEFAULT_FIELDS =
	'custom_field.gid,custom_field.name,custom_field.resource_subtype,custom_field.enum_options.gid,custom_field.enum_options.name'

describe('custom-fields/cli custom field settings', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('custom-field project applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listCustomFieldSettingsForProject = vi.fn().mockResolvedValue([
			{
				gid: 'cfs1',
				custom_field: {
					gid: 'cf1',
					name: 'Priority',
					resource_subtype: 'enum',
					enum_options: [
						{ gid: 'eo1', name: 'High' },
						{ gid: 'eo2', name: 'Low' },
					],
				},
			},
		])
		const program = new Command().addCommand(
			customFieldCommand({ ...settingsApiStub(), listCustomFieldSettingsForProject }),
		)

		await program.parseAsync(['node', 'test', 'custom-field', 'project', 'proj1'], { from: 'node' })

		expect(listCustomFieldSettingsForProject).toHaveBeenCalledWith(
			'proj1',
			expect.objectContaining({ optFields: SETTINGS_DEFAULT_FIELDS }),
		)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Priority') && l.includes('enum') && l.includes('High, Low'))).toBe(true)
		expect(lines).toContain('\n1 custom field(s)')
		expect(lines.some((l) => l.includes('cyber-asana task update <gid> --custom-field'))).toBe(true)
		logSpy.mockRestore()
	})

	it('custom-field project names the entity when nothing is attached', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(
			customFieldCommand({ ...settingsApiStub(), listCustomFieldSettingsForProject: vi.fn().mockResolvedValue([]) }),
		)

		await program.parseAsync(['node', 'test', 'custom-field', 'project', 'proj1'], { from: 'node' })

		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('0 custom fields found')
		logSpy.mockRestore()
	})

	it('custom-field project respects an explicit --opt-fields override', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listCustomFieldSettingsForProject = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			customFieldCommand({ ...settingsApiStub(), listCustomFieldSettingsForProject }),
		)

		await program.parseAsync(
			['node', 'test', 'custom-field', 'project', 'proj1', '--opt-fields', 'custom_field.name'],
			{
				from: 'node',
			},
		)

		expect(listCustomFieldSettingsForProject).toHaveBeenCalledWith(
			'proj1',
			expect.objectContaining({ optFields: 'custom_field.name' }),
		)
		vi.restoreAllMocks()
	})

	it('custom-field portfolio forwards the gid and pagination options', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		listForPortfolioMock.mockResolvedValue({ data: [] })
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', 'custom-field', 'portfolio', 'port1', '--limit', '25'], { from: 'node' })

		expect(listForPortfolioMock).toHaveBeenCalledWith(
			'port1',
			expect.objectContaining({ limit: 25, optFields: SETTINGS_DEFAULT_FIELDS }),
		)
		vi.restoreAllMocks()
	})

	it('custom-field goal forwards the gid', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		listForGoalMock.mockResolvedValue({ data: [] })
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', 'custom-field', 'goal', 'goal1'], { from: 'node' })

		expect(listForGoalMock).toHaveBeenCalledWith(
			'goal1',
			expect.objectContaining({ optFields: SETTINGS_DEFAULT_FIELDS }),
		)
		vi.restoreAllMocks()
	})

	it('custom-field team forwards the gid', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		listForTeamMock.mockResolvedValue({ data: [] })
		const program = new Command().addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', 'custom-field', 'team', 'team1'], { from: 'node' })

		expect(listForTeamMock).toHaveBeenCalledWith(
			'team1',
			expect.objectContaining({ optFields: SETTINGS_DEFAULT_FIELDS }),
		)
		vi.restoreAllMocks()
	})

	it('custom-field project emits structured output with --json', async () => {
		const settings = [{ gid: 'cfs1', custom_field: { gid: 'cf1', name: 'Priority' } }]
		listForProjectMock.mockResolvedValue(settings)
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(customFieldCommand())

		await program.parseAsync(['node', 'test', '--json', 'custom-field', 'project', 'proj1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(JSON.stringify(settings, null, 2))
		logSpy.mockRestore()
	})
})
