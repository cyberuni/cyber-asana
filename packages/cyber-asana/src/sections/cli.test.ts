import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SectionApi } from './api.js'

const createSectionMock = vi.fn()
const updateSectionMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		createSection: createSectionMock,
		updateSection: updateSectionMock,
	}
})

const { sectionCommand } = await import('./cli.js')

function apiDouble(overrides: Partial<SectionApi> = {}): SectionApi {
	return {
		listSections: vi.fn(),
		getSection: vi.fn(),
		createSection: vi.fn(),
		updateSection: vi.fn(),
		deleteSection: vi.fn(),
		moveSection: vi.fn(),
		addTaskToSection: vi.fn(),
		...overrides,
	} as SectionApi
}

describe('sections/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('section list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listSections = vi.fn().mockResolvedValue([{ gid: 'sec1', name: 'To Do' }])
		const program = new Command().addCommand(sectionCommand(apiDouble({ listSections })))

		await program.parseAsync(['node', 'test', 'section', 'list', '--project-gid', 'proj1'], { from: 'node' })

		expect(listSections).toHaveBeenCalledWith('proj1', expect.objectContaining({ optFields: 'gid,name' }))
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 section(s)')
		expect(lines.some((l) => l.includes('cyber-asana section get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('section list respects an explicit --opt-fields override', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listSections = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(sectionCommand(apiDouble({ listSections })))

		await program.parseAsync(['node', 'test', 'section', 'list', '--project-gid', 'proj1', '--opt-fields', 'name'], {
			from: 'node',
		})

		expect(listSections).toHaveBeenCalledWith('proj1', expect.objectContaining({ optFields: 'name' }))
		vi.restoreAllMocks()
	})

	it('section delete emits a structured acknowledgement with --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command()
			.option('--json')
			.addCommand(sectionCommand(apiDouble({ deleteSection: vi.fn().mockResolvedValue(undefined) })))

		await program.parseAsync(['node', 'test', '--json', 'section', 'delete', 'sec1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'section', gid: 'sec1', already_absent: false }, null, 2),
		)
		logSpy.mockRestore()
	})

	it('section delete is idempotent — a repeat is a no-op, not a 404', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(
			sectionCommand(
				apiDouble({
					deleteSection: vi.fn().mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'x' }] } } }),
				}),
			),
		)

		await expect(
			program.parseAsync(['node', 'test', '--json', 'section', 'delete', 'sec1'], { from: 'node' }),
		).resolves.toBeDefined()

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'section', gid: 'sec1', already_absent: true }, null, 2),
		)
		logSpy.mockRestore()
	})

	it('section delete still surfaces a non-404 failure', async () => {
		const program = new Command().addCommand(
			sectionCommand(
				apiDouble({
					deleteSection: vi.fn().mockRejectedValue({ response: { status: 403, body: { errors: [{ message: 'x' }] } } }),
				}),
			),
		)

		await expect(
			program.parseAsync(['node', 'test', 'section', 'delete', 'sec1'], { from: 'node' }),
		).rejects.toBeDefined()
	})

	it('section create forwards project gid and name', async () => {
		createSectionMock.mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const program = new Command().addCommand(sectionCommand())

		await program.parseAsync(['node', 'test', 'section', 'create', 'In Progress', '--project-gid', 'proj1'], {
			from: 'node',
		})

		expect(createSectionMock).toHaveBeenCalledWith('proj1', 'In Progress', {
			insertBefore: undefined,
			insertAfter: undefined,
		})
	})

	it('section create places the new section before an existing one', async () => {
		const createSection = vi.fn().mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const program = new Command().addCommand(sectionCommand(apiDouble({ createSection })))

		await program.parseAsync(
			['node', 'test', 'section', 'create', 'In Progress', '--project-gid', 'proj1', '--insert-before', 'sec2'],
			{ from: 'node' },
		)

		expect(createSection).toHaveBeenCalledWith('proj1', 'In Progress', {
			insertBefore: 'sec2',
			insertAfter: undefined,
		})
	})

	it('section create places the new section after an existing one', async () => {
		const createSection = vi.fn().mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const program = new Command().addCommand(sectionCommand(apiDouble({ createSection })))

		await program.parseAsync(
			['node', 'test', 'section', 'create', 'In Progress', '--project-gid', 'proj1', '--insert-after', 'sec2'],
			{ from: 'node' },
		)

		expect(createSection).toHaveBeenCalledWith('proj1', 'In Progress', {
			insertBefore: undefined,
			insertAfter: 'sec2',
		})
	})

	it('section create rejects passing both --insert-before and --insert-after', async () => {
		const createSection = vi.fn()
		const program = new Command().addCommand(sectionCommand(apiDouble({ createSection })))

		await expect(
			program.parseAsync(
				[
					'node',
					'test',
					'section',
					'create',
					'In Progress',
					'--project-gid',
					'proj1',
					'--insert-before',
					'sec2',
					'--insert-after',
					'sec3',
				],
				{ from: 'node' },
			),
		).rejects.toThrow('--insert-after and --insert-before are mutually exclusive')
		expect(createSection).not.toHaveBeenCalled()
	})

	it('section update forwards gid and new name', async () => {
		updateSectionMock.mockResolvedValue({ gid: 'sec1', name: 'Done' })
		const program = new Command().addCommand(sectionCommand())

		await program.parseAsync(['node', 'test', 'section', 'update', 'sec1', '--name', 'Done'], { from: 'node' })

		expect(updateSectionMock).toHaveBeenCalledWith('sec1', 'Done')
	})

	it('section command can use injected dependencies', async () => {
		const injectedCreateSection = vi.fn().mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const program = new Command().addCommand(sectionCommand(apiDouble({ createSection: injectedCreateSection })))

		await program.parseAsync(['node', 'test', 'section', 'create', 'In Progress', '--project-gid', 'proj1'], {
			from: 'node',
		})

		expect(injectedCreateSection).toHaveBeenCalledWith('proj1', 'In Progress', {
			insertBefore: undefined,
			insertAfter: undefined,
		})
	})

	it('section move places a section before another one', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const moveSection = vi.fn().mockResolvedValue(undefined)
		const program = new Command().addCommand(sectionCommand(apiDouble({ moveSection })))

		await program.parseAsync(
			['node', 'test', 'section', 'move', 'sec1', '--project-gid', 'proj1', '--insert-before', 'sec2'],
			{ from: 'node' },
		)

		expect(moveSection).toHaveBeenCalledWith('proj1', 'sec1', { insertBefore: 'sec2', insertAfter: undefined })
		vi.restoreAllMocks()
	})

	it('section move emits a structured acknowledgement with --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command()
			.option('--json')
			.addCommand(sectionCommand(apiDouble({ moveSection: vi.fn().mockResolvedValue(undefined) })))

		await program.parseAsync(
			['node', 'test', '--json', 'section', 'move', 'sec1', '--project-gid', 'proj1', '--insert-after', 'sec2'],
			{ from: 'node' },
		)

		expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ section: 'sec1', project: 'proj1', status: 'moved' }, null, 2))
		logSpy.mockRestore()
	})

	it('section move rejects passing both --insert-before and --insert-after', async () => {
		const moveSection = vi.fn()
		const program = new Command().addCommand(sectionCommand(apiDouble({ moveSection })))

		await expect(
			program.parseAsync(
				[
					'node',
					'test',
					'section',
					'move',
					'sec1',
					'--project-gid',
					'proj1',
					'--insert-before',
					'sec2',
					'--insert-after',
					'sec3',
				],
				{ from: 'node' },
			),
		).rejects.toThrow('--insert-after and --insert-before are mutually exclusive')
		expect(moveSection).not.toHaveBeenCalled()
	})

	it('section move requires one of --insert-before or --insert-after', async () => {
		const moveSection = vi.fn()
		const program = new Command().addCommand(sectionCommand(apiDouble({ moveSection })))

		await expect(
			program.parseAsync(['node', 'test', 'section', 'move', 'sec1', '--project-gid', 'proj1'], { from: 'node' }),
		).rejects.toThrow('one of --insert-before or --insert-after is required')
		expect(moveSection).not.toHaveBeenCalled()
	})

	it('section task add places a task into a section', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const addTaskToSection = vi.fn().mockResolvedValue(undefined)
		const program = new Command().addCommand(sectionCommand(apiDouble({ addTaskToSection })))

		await program.parseAsync(['node', 'test', 'section', 'task', 'add', 'sec1', 'task1', '--insert-after', 'task2'], {
			from: 'node',
		})

		expect(addTaskToSection).toHaveBeenCalledWith('sec1', 'task1', {
			insertAfter: 'task2',
			insertBefore: undefined,
		})
		vi.restoreAllMocks()
	})

	it('section task add emits a structured acknowledgement with --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command()
			.option('--json')
			.addCommand(sectionCommand(apiDouble({ addTaskToSection: vi.fn().mockResolvedValue(undefined) })))

		await program.parseAsync(['node', 'test', '--json', 'section', 'task', 'add', 'sec1', 'task1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ task: 'task1', section: 'sec1', status: 'added' }, null, 2))
		logSpy.mockRestore()
	})

	it('section task add rejects passing both --insert-before and --insert-after', async () => {
		const addTaskToSection = vi.fn()
		const program = new Command().addCommand(sectionCommand(apiDouble({ addTaskToSection })))

		await expect(
			program.parseAsync(
				['node', 'test', 'section', 'task', 'add', 'sec1', 'task1', '--insert-before', 't2', '--insert-after', 't3'],
				{ from: 'node' },
			),
		).rejects.toThrow('--insert-after and --insert-before are mutually exclusive')
		expect(addTaskToSection).not.toHaveBeenCalled()
	})
})
