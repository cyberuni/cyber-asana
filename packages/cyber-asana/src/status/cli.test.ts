import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listStatusesMock = vi.fn()
const createStatusMock = vi.fn()
const deleteStatusMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		listStatuses: listStatusesMock,
		createStatus: createStatusMock,
		deleteStatus: deleteStatusMock,
	}
})

const { statusCommand } = await import('./cli.js')

describe('status/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('status list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listStatuses = vi.fn().mockResolvedValue([{ gid: 'st1', status_type: 'on_track' }])
		const program = new Command().addCommand(
			statusCommand({
				listStatuses,
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'status', 'list', '--parent-gid', 'proj1'], { from: 'node' })

		expect(listStatuses).toHaveBeenCalledWith(
			'proj1',
			expect.objectContaining({ optFields: 'gid,status_type,title,created_at' }),
		)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 status update(s)')
		expect(lines.some((l) => l.includes('cyber-asana status get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('status list respects an explicit --opt-fields override', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listStatuses = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			statusCommand({
				listStatuses,
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'status', 'list', '--parent-gid', 'proj1', '--opt-fields', 'gid,text'], {
			from: 'node',
		})

		expect(listStatuses).toHaveBeenCalledWith('proj1', expect.objectContaining({ optFields: 'gid,text' }))
		vi.restoreAllMocks()
	})

	it('status get truncates a long update body by default and shows it all with --full', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getStatus = vi.fn().mockResolvedValue({ gid: 'st1', status_type: 'on_track', text: 'x'.repeat(600) })
		const deps = {
			listStatuses: vi.fn(),
			getStatus,
			createStatus: vi.fn(),
			deleteStatus: vi.fn(),
			getStatusOverview: vi.fn(),
		}

		await new Command()
			.addCommand(statusCommand(deps))
			.parseAsync(['node', 'test', 'status', 'get', 'st1'], { from: 'node' })
		expect(logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('Text'))).toContain(
			'[truncated, 600 chars total; use --full for the rest]',
		)

		logSpy.mockClear()
		process.argv = ['node', 'test', '--full']
		await new Command()
			.option('--full')
			.addCommand(statusCommand(deps))
			.parseAsync(['node', 'test', '--full', 'status', 'get', 'st1'], { from: 'node' })
		expect(logSpy.mock.calls.map((c) => String(c[0])).find((l) => l.startsWith('Text'))).not.toContain('[truncated')
		logSpy.mockRestore()
	})

	it('status delete emits a structured acknowledgement with --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(
			statusCommand({
				listStatuses: vi.fn(),
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn().mockResolvedValue(undefined),
				getStatusOverview: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', '--json', 'status', 'delete', 'st1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'status_update', gid: 'st1', already_absent: false }, null, 2),
		)
		logSpy.mockRestore()
	})

	it('status overview prints the parent roll-up and its items', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getStatusOverview = vi.fn().mockResolvedValue({
			parent: {
				gid: 'pf1',
				name: 'Q3 bets',
				resource_type: 'portfolio',
				status: { gid: 'st0', status_type: 'at_risk', title: 'Week 12' },
				counts: null,
			},
			items: [
				{
					gid: 'p1',
					name: 'Apollo',
					resource_type: 'project',
					status: { gid: 'st1', status_type: 'on_track' },
					counts: { num_tasks: 10, num_completed_tasks: 4 },
				},
			],
			item_count: 1,
			item_limit: 25,
			truncated: false,
		})
		const program = new Command().addCommand(
			statusCommand({
				listStatuses: vi.fn(),
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview,
			}),
		)

		await program.parseAsync(['node', 'test', 'status', 'overview', 'pf1'], { from: 'node' })

		expect(getStatusOverview).toHaveBeenCalledWith('pf1', {})
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Q3 bets'))).toBe(true)
		expect(lines.some((l) => l.includes('Apollo') && l.includes('on_track'))).toBe(true)
		expect(lines).toContain('\n1 item(s) rolled up')
		expect(lines.some((l) => l.includes('cyber-asana status list'))).toBe(true)
		logSpy.mockRestore()
	})

	it('status overview names the empty state when a portfolio has no items', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getStatusOverview = vi.fn().mockResolvedValue({
			parent: { gid: 'pf1', name: 'Q3 bets', resource_type: 'portfolio', status: null, counts: null },
			items: [],
			item_count: 0,
			item_limit: 25,
			truncated: false,
		})
		const program = new Command().addCommand(
			statusCommand({
				listStatuses: vi.fn(),
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview,
			}),
		)

		await program.parseAsync(['node', 'test', 'status', 'overview', 'pf1'], { from: 'node' })

		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('0 portfolio items found')
		logSpy.mockRestore()
	})

	it('status overview says so when the item roll-up was capped', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getStatusOverview = vi.fn().mockResolvedValue({
			parent: { gid: 'pf1', name: 'Q3 bets', resource_type: 'portfolio', status: null, counts: null },
			items: [{ gid: 'p1', name: 'Apollo', resource_type: 'project', status: null, counts: null }],
			item_count: 1,
			item_limit: 1,
			truncated: true,
		})
		const program = new Command().addCommand(
			statusCommand({
				listStatuses: vi.fn(),
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview,
			}),
		)

		await program.parseAsync(['node', 'test', 'status', 'overview', 'pf1', '--limit', '1'], { from: 'node' })

		expect(getStatusOverview).toHaveBeenCalledWith('pf1', { limit: 1 })
		expect(logSpy.mock.calls.map((c) => String(c[0])).some((l) => l.includes('capped at 1'))).toBe(true)
		logSpy.mockRestore()
	})

	it('status overview forwards an explicit --parent-type', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const getStatusOverview = vi.fn().mockResolvedValue({
			parent: {
				gid: 'proj1',
				name: 'Apollo',
				resource_type: 'project',
				status: null,
				counts: { num_tasks: 3, num_completed_tasks: 1, num_incomplete_tasks: 2 },
			},
			items: [],
			item_count: 0,
			item_limit: 25,
			truncated: false,
		})
		const program = new Command().addCommand(
			statusCommand({
				listStatuses: vi.fn(),
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview,
			}),
		)

		await program.parseAsync(['node', 'test', 'status', 'overview', 'proj1', '--parent-type', 'project'], {
			from: 'node',
		})

		expect(getStatusOverview).toHaveBeenCalledWith('proj1', { parentType: 'project' })
		vi.restoreAllMocks()
	})

	it('status overview rejects a --parent-type outside the two parent kinds', async () => {
		const status = statusCommand({
			listStatuses: vi.fn(),
			getStatus: vi.fn(),
			createStatus: vi.fn(),
			deleteStatus: vi.fn(),
			getStatusOverview: vi.fn(),
		})
		status.exitOverride()
		for (const sub of status.commands) sub.exitOverride()
		const program = new Command().exitOverride().addCommand(status)

		await expect(
			program.parseAsync(['node', 'test', 'status', 'overview', 'pf1', '--parent-type', 'goal'], { from: 'node' }),
		).rejects.toThrow(/parent-type/)
	})

	it('status list forwards parent gid and pagination options', async () => {
		listStatusesMock.mockResolvedValue({ data: [{ gid: 'st1', status_type: 'on_track' }], next_page: null, limit: 100 })
		const program = new Command().addCommand(statusCommand())

		await program.parseAsync(['node', 'test', 'status', 'list', '--parent-gid', 'proj1', '--limit', '25'], {
			from: 'node',
		})

		expect(listStatusesMock).toHaveBeenCalledWith('proj1', {
			limit: 25,
			optFields: 'gid,status_type,title,created_at',
		})
	})

	it('status create forwards parent gid, status type, and text', async () => {
		createStatusMock.mockResolvedValue({ gid: 'st1', status_type: 'on_track', text: 'All good' })
		const program = new Command().addCommand(statusCommand())

		await program.parseAsync(
			['node', 'test', 'status', 'create', '--parent-gid', 'proj1', '--status-type', 'on_track', '--text', 'All good'],
			{ from: 'node' },
		)

		expect(createStatusMock).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'All good' })
	})

	it('status delete forwards gid', async () => {
		deleteStatusMock.mockResolvedValue(undefined)
		const program = new Command().addCommand(statusCommand())

		await program.parseAsync(['node', 'test', 'status', 'delete', 'st1'], { from: 'node' })

		expect(deleteStatusMock).toHaveBeenCalledWith('st1')
	})

	it('status command can use injected dependencies', async () => {
		const injectedCreateStatus = vi.fn().mockResolvedValue({ gid: 'st1', status_type: 'on_track' })
		const program = new Command().addCommand(
			statusCommand({
				listStatuses: vi.fn(),
				getStatus: vi.fn(),
				createStatus: injectedCreateStatus,
				deleteStatus: vi.fn(),
				getStatusOverview: vi.fn(),
			}),
		)

		await program.parseAsync(
			['node', 'test', 'status', 'create', '--parent-gid', 'proj1', '--status-type', 'on_track', '--text', 'Hi'],
			{ from: 'node' },
		)

		expect(injectedCreateStatus).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'Hi' })
	})

	it('status list forwards --created-since to the api', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listStatuses = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			statusCommand({
				listStatuses,
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview: vi.fn(),
			}),
		)

		await program.parseAsync(
			['node', 'test', 'status', 'list', '--parent-gid', 'proj1', '--created-since', '2026-01-01T00:00:00Z'],
			{ from: 'node' },
		)

		expect(listStatuses).toHaveBeenCalledWith(
			'proj1',
			expect.objectContaining({ createdSince: '2026-01-01T00:00:00Z' }),
		)
		vi.restoreAllMocks()
	})

	it('status list sends no createdSince when the flag is omitted', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listStatuses = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			statusCommand({
				listStatuses,
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
				getStatusOverview: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'status', 'list', '--parent-gid', 'proj1'], { from: 'node' })

		expect(listStatuses.mock.calls[0][1]).not.toHaveProperty('createdSince')
		vi.restoreAllMocks()
	})
})
