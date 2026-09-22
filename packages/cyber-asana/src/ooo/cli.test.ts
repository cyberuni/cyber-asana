import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createOooEntryMock = vi.fn()
const updateOooEntryMock = vi.fn()
const deleteOooEntryMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createOooEntry: createOooEntryMock,
		updateOooEntry: updateOooEntryMock,
		deleteOooEntry: deleteOooEntryMock,
	}
})

const { oooCommand } = await import('./cli.js')

function oooApiStub() {
	return {
		listOooEntries: vi.fn(),
		getOooEntry: vi.fn(),
		createOooEntry: vi.fn(),
		updateOooEntry: vi.fn(),
		deleteOooEntry: vi.fn(),
	}
}

describe('ooo/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('ooo list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listOooEntries = vi.fn().mockResolvedValue([{ gid: 'ooo1', start_date: '2026-01-01' }])
		const program = new Command().addCommand(oooCommand({ ...oooApiStub(), listOooEntries }))

		await program.parseAsync(['node', 'test', 'ooo', 'list', '--user-gid', 'user1', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(listOooEntries).toHaveBeenCalledWith(
			'user1',
			'ws1',
			expect.objectContaining({ optFields: 'gid,start_date,end_date,user.name' }),
		)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 out-of-office entr(ies)')
		expect(lines.some((l) => l.includes('cyber-asana ooo create'))).toBe(true)
		logSpy.mockRestore()
	})

	it('ooo list defaults the user to the authenticated user', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listOooEntries = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(oooCommand({ ...oooApiStub(), listOooEntries }))

		await program.parseAsync(['node', 'test', 'ooo', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listOooEntries).toHaveBeenCalledWith('me', 'ws1', expect.anything())
		vi.restoreAllMocks()
	})

	it('ooo list forwards the date window filters', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listOooEntries = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(oooCommand({ ...oooApiStub(), listOooEntries }))

		await program.parseAsync(
			[
				'node',
				'test',
				'ooo',
				'list',
				'--workspace-gid',
				'ws1',
				'--start-date',
				'2026-01-01',
				'--end-date',
				'2026-01-31',
			],
			{ from: 'node' },
		)

		expect(listOooEntries).toHaveBeenCalledWith(
			'me',
			'ws1',
			expect.objectContaining({ startDate: '2026-01-01', endDate: '2026-01-31' }),
		)
		vi.restoreAllMocks()
	})

	it('ooo list respects an explicit --opt-fields override', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listOooEntries = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(oooCommand({ ...oooApiStub(), listOooEntries }))

		await program.parseAsync(['node', 'test', 'ooo', 'list', '--workspace-gid', 'ws1', '--opt-fields', 'start_date'], {
			from: 'node',
		})

		expect(listOooEntries).toHaveBeenCalledWith('me', 'ws1', expect.objectContaining({ optFields: 'start_date' }))
		vi.restoreAllMocks()
	})

	it('ooo get renders a single entry', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getOooEntry = vi.fn().mockResolvedValue({
			gid: 'ooo1',
			start_date: '2026-01-01',
			end_date: '2026-01-15',
			user: { gid: 'user1', name: 'Ada' },
		})
		const program = new Command().addCommand(oooCommand({ ...oooApiStub(), getOooEntry }))

		await program.parseAsync(['node', 'test', 'ooo', 'get', 'ooo1'], { from: 'node' })

		expect(getOooEntry).toHaveBeenCalledWith('ooo1', undefined)
		expect(logSpy.mock.calls.map((c) => String(c[0])).some((l) => l.includes('Ada'))).toBe(true)
		logSpy.mockRestore()
	})

	it('ooo create defaults the user and forwards the date window', async () => {
		createOooEntryMock.mockResolvedValue({ gid: 'ooo1', start_date: '2026-01-01' })
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(oooCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'ooo',
				'create',
				'--workspace-gid',
				'ws1',
				'--start-date',
				'2026-01-01',
				'--end-date',
				'2026-01-15',
			],
			{ from: 'node' },
		)

		expect(createOooEntryMock).toHaveBeenCalledWith('me', 'ws1', {
			start_date: '2026-01-01',
			end_date: '2026-01-15',
		})
		vi.restoreAllMocks()
	})

	it('ooo create rejects a missing date window', async () => {
		const program = new Command().exitOverride().addCommand(oooCommand())

		await expect(
			program.parseAsync(['node', 'test', 'ooo', 'create', '--workspace-gid', 'ws1', '--start-date', '2026-01-01'], {
				from: 'node',
			}),
		).rejects.toThrow(/--end-date/)
	})

	it('ooo update forwards the mutable date fields', async () => {
		updateOooEntryMock.mockResolvedValue({ gid: 'ooo1', end_date: '2026-01-20' })
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(oooCommand())

		await program.parseAsync(['node', 'test', 'ooo', 'update', 'ooo1', '--end-date', '2026-01-20'], { from: 'node' })

		expect(updateOooEntryMock).toHaveBeenCalledWith('ooo1', { end_date: '2026-01-20' })
		vi.restoreAllMocks()
	})

	it('ooo delete removes an entry by gid', async () => {
		deleteOooEntryMock.mockResolvedValue(undefined)
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(oooCommand())

		await program.parseAsync(['node', 'test', 'ooo', 'delete', 'ooo1'], { from: 'node' })

		expect(deleteOooEntryMock).toHaveBeenCalledWith('ooo1')
		expect(logSpy).toHaveBeenCalledWith('Deleted out-of-office entry ooo1')
		logSpy.mockRestore()
	})

	it('ooo delete emits a structured acknowledgement with --json', async () => {
		deleteOooEntryMock.mockResolvedValue(undefined)
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(oooCommand())

		await program.parseAsync(['node', 'test', '--json', 'ooo', 'delete', 'ooo1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'ooo_entry', gid: 'ooo1', already_absent: false }, null, 2),
		)
		logSpy.mockRestore()
	})
})
