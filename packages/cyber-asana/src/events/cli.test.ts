import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getEventsMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return { ...actual, getEvents: getEventsMock }
})

const { eventCommand } = await import('./cli.js')

function run(api: { getEvents: ReturnType<typeof vi.fn> }, argv: string[]) {
	const program = new Command().addCommand(eventCommand(api as never))
	return program.parseAsync(['node', 'test', ...argv], { from: 'node' })
}

describe('events/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.restoreAllMocks()
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('event list forwards the resource gid and the sync token', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-2', has_more: false, sync_reset: false })

		await run({ getEvents }, ['event', 'list', 'proj1', '--sync', 'tok-1'])

		expect(getEvents).toHaveBeenCalledWith('proj1', { sync: 'tok-1' })
	})

	it('event list omits the sync token on a first call', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-1', has_more: false, sync_reset: true })

		await run({ getEvents }, ['event', 'list', 'proj1'])

		expect(getEvents).toHaveBeenCalledWith('proj1', {})
	})

	it('renders the change table, a count summary, and the token to pass next time', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getEvents = vi.fn().mockResolvedValue({
			data: [
				{
					action: 'changed',
					created_at: '2026-08-08T10:00:00.000Z',
					resource: { gid: 't1', name: 'Ship the feed', resource_type: 'task' },
					user: { gid: 'u1', name: 'Ada' },
					change: { field: 'assignee', action: 'changed' },
				},
			],
			sync: 'tok-2',
			has_more: false,
			sync_reset: false,
		})

		await run({ getEvents }, ['event', 'list', 'proj1', '--sync', 'tok-1'])

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Ship the feed') && l.includes('assignee'))).toBe(true)
		expect(lines).toContain('\n1 event(s)')
		expect(lines.some((l) => l.includes('Sync token') && l.includes('tok-2'))).toBe(true)
		expect(lines.some((l) => l.includes('--sync tok-2'))).toBe(true)
	})

	it('reports a sync reset as a starting point rather than an empty result', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-1', has_more: false, sync_reset: true })

		await run({ getEvents }, ['event', 'list', 'proj1'])

		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Sync token established'))).toBe(true)
		expect(lines).not.toContain('0 events found')
	})

	it('names the empty state when a valid token simply found nothing', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-2', has_more: false, sync_reset: false })

		await run({ getEvents }, ['event', 'list', 'proj1', '--sync', 'tok-1'])

		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('0 events found')
	})

	it('flags a truncated feed so the caller knows to poll again', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getEvents = vi.fn().mockResolvedValue({
			data: [{ action: 'added', resource: { gid: 't1' } }],
			sync: 'tok-2',
			has_more: true,
			sync_reset: false,
		})

		await run({ getEvents }, ['event', 'list', 'proj1', '--sync', 'tok-1'])

		expect(logSpy.mock.calls.map((c) => String(c[0])).some((l) => l.includes('More events are waiting'))).toBe(true)
	})

	it('emits the raw feed under --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const feed = { data: [], sync: 'tok-1', has_more: false, sync_reset: true }
		const getEvents = vi.fn().mockResolvedValue(feed)
		process.argv = [...originalArgv, '--json']

		await run({ getEvents }, ['event', 'list', 'proj1'])

		expect(logSpy).toHaveBeenCalledWith(JSON.stringify(feed, null, 2))
	})

	it('passes an explicit --opt-fields through', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-2', has_more: false, sync_reset: false })

		await run({ getEvents }, ['event', 'list', 'proj1', '--opt-fields', 'action,resource.name'])

		expect(getEvents).toHaveBeenCalledWith('proj1', { optFields: 'action,resource.name' })
	})

	it('falls back to the module-level api when none is injected', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		getEventsMock.mockResolvedValue({ data: [], sync: 'tok-1', has_more: false, sync_reset: true })
		const program = new Command().addCommand(eventCommand())

		await program.parseAsync(['node', 'test', 'event', 'list', 'proj1'], { from: 'node' })

		expect(getEventsMock).toHaveBeenCalledWith('proj1', {})
	})
})
