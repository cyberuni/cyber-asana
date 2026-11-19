import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTimeTrackingEntryApi } from './api.js'
import { timeTrackingEntryCommand } from './cli.js'
import { createAsanaTimeTrackingEntryGateway } from './gateway.js'
import { registerTimeTrackingEntryTools } from './mcp.js'

const entry = { gid: 'e1', duration_minutes: 90, entered_on: '2026-11-17' }
const client = {} as Asana.ApiClient

describe('time-tracking/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('create sends the entry fields under the task, snake_cased and only when given', async () => {
		const spy = vi
			.spyOn(Asana.TimeTrackingEntriesApi.prototype, 'createTimeTrackingEntry')
			.mockResolvedValue({ data: entry } as never)

		const created = await createAsanaTimeTrackingEntryGateway(client).createTimeTrackingEntry('t1', {
			durationMinutes: 90,
			enteredOn: '2026-11-17',
		})

		expect(created).toEqual(entry)
		expect(spy).toHaveBeenCalledWith({ data: { duration_minutes: 90, entered_on: '2026-11-17' } }, 't1', {})
	})

	it('update sends only the changed fields', async () => {
		const spy = vi
			.spyOn(Asana.TimeTrackingEntriesApi.prototype, 'updateTimeTrackingEntry')
			.mockResolvedValue({ data: entry } as never)

		await createAsanaTimeTrackingEntryGateway(client).updateTimeTrackingEntry('e1', { durationMinutes: 30 })

		expect(spy).toHaveBeenCalledWith({ data: { duration_minutes: 30 } }, 'e1', {})
	})

	it('delete calls deleteTimeTrackingEntry', async () => {
		const spy = vi
			.spyOn(Asana.TimeTrackingEntriesApi.prototype, 'deleteTimeTrackingEntry')
			.mockResolvedValue({ data: {} } as never)

		await createAsanaTimeTrackingEntryGateway(client).deleteTimeTrackingEntry('e1')

		expect(spy).toHaveBeenCalledWith('e1')
	})

	it('list maps filters to the query and paginates', async () => {
		const spy = vi
			.spyOn(Asana.TimeTrackingEntriesApi.prototype, 'getTimeTrackingEntries')
			.mockResolvedValue({ data: [entry] } as never)

		await createAsanaTimeTrackingEntryGateway(client).listTimeTrackingEntries(
			{ task: 't1', user: 'u1', workspace: 'w1', enteredOnStart: '2026-11-01', enteredOnEnd: '2026-11-30' },
			{ limit: 10 },
		)

		expect(spy).toHaveBeenCalledWith({
			task: 't1',
			user: 'u1',
			workspace: 'w1',
			entered_on_start_date: '2026-11-01',
			entered_on_end_date: '2026-11-30',
			limit: 10,
		})
	})

	it('listForTask reads a task’s entries', async () => {
		const spy = vi
			.spyOn(Asana.TimeTrackingEntriesApi.prototype, 'getTimeTrackingEntriesForTask')
			.mockResolvedValue({ data: [entry] } as never)

		await createAsanaTimeTrackingEntryGateway(client).listTimeTrackingEntriesForTask('t1')

		expect(spy).toHaveBeenCalledWith('t1', { limit: 100 })
	})
})

describe('time-tracking/api', () => {
	it('forwards every operation to the gateway', async () => {
		const gateway = {
			listTimeTrackingEntries: vi.fn().mockResolvedValue([entry]),
			listTimeTrackingEntriesForTask: vi.fn().mockResolvedValue([entry]),
			getTimeTrackingEntry: vi.fn().mockResolvedValue(entry),
			createTimeTrackingEntry: vi.fn().mockResolvedValue(entry),
			updateTimeTrackingEntry: vi.fn().mockResolvedValue(entry),
			deleteTimeTrackingEntry: vi.fn().mockResolvedValue(undefined),
		}
		const api = createTimeTrackingEntryApi(gateway)

		await api.listTimeTrackingEntries({ task: 't1' }, { limit: 5 })
		await api.listTimeTrackingEntriesForTask('t1', { limit: 5 })
		await api.getTimeTrackingEntry('e1', { optFields: 'gid' })
		await api.createTimeTrackingEntry('t1', { durationMinutes: 5 })
		await api.updateTimeTrackingEntry('e1', { durationMinutes: 6 })
		await api.deleteTimeTrackingEntry('e1')

		expect(gateway.listTimeTrackingEntries).toHaveBeenCalledWith({ task: 't1' }, { limit: 5 })
		expect(gateway.listTimeTrackingEntriesForTask).toHaveBeenCalledWith('t1', { limit: 5 })
		expect(gateway.getTimeTrackingEntry).toHaveBeenCalledWith('e1', { optFields: 'gid' })
		expect(gateway.createTimeTrackingEntry).toHaveBeenCalledWith('t1', { durationMinutes: 5 }, undefined)
		expect(gateway.updateTimeTrackingEntry).toHaveBeenCalledWith('e1', { durationMinutes: 6 }, undefined)
		expect(gateway.deleteTimeTrackingEntry).toHaveBeenCalledWith('e1')
	})
})

describe('time-tracking/cli', () => {
	beforeEach(() => vi.stubEnv('ASANA_WORKSPACE_GID', ''))
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllEnvs()
	})

	async function run(api: Record<string, unknown>, ...argv: string[]) {
		const program = new Command().addCommand(timeTrackingEntryCommand(api as never))
		await program.parseAsync(['node', 't', 'time-entry', ...argv], { from: 'node' })
	}

	it('create converts --hours or --minutes to minutes', async () => {
		const createTimeTrackingEntry = vi.fn().mockResolvedValue(entry)
		vi.spyOn(console, 'log').mockImplementation(() => {})

		await run({ createTimeTrackingEntry }, 'create', 't1', '--minutes', '90', '--entered-on', '2026-11-17')
		await run({ createTimeTrackingEntry }, 'create', 't1', '--hours', '1.5')

		expect(createTimeTrackingEntry).toHaveBeenNthCalledWith(
			1,
			't1',
			{ durationMinutes: 90, enteredOn: '2026-11-17' },
			undefined,
		)
		expect(createTimeTrackingEntry).toHaveBeenNthCalledWith(2, 't1', { durationMinutes: 90 }, undefined)
	})

	it('create rejects giving both --hours and --minutes, or neither', async () => {
		const createTimeTrackingEntry = vi.fn()
		await expect(run({ createTimeTrackingEntry }, 'create', 't1', '--hours', '1', '--minutes', '5')).rejects.toThrow(
			/mutually exclusive/,
		)
		await expect(run({ createTimeTrackingEntry }, 'create', 't1')).rejects.toThrow(/--hours or --minutes/)
		expect(createTimeTrackingEntry).not.toHaveBeenCalled()
	})

	it('update needs at least one field', async () => {
		const updateTimeTrackingEntry = vi.fn().mockResolvedValue(entry)
		vi.spyOn(console, 'log').mockImplementation(() => {})
		await expect(run({ updateTimeTrackingEntry }, 'update', 'e1')).rejects.toThrow(/Nothing to update/)

		await run({ updateTimeTrackingEntry }, 'update', 'e1', '--minutes', '45')

		expect(updateTimeTrackingEntry).toHaveBeenCalledWith('e1', { durationMinutes: 45 }, undefined)
	})

	it('list passes filters and names the empty state', async () => {
		const listTimeTrackingEntries = vi.fn().mockResolvedValue([])
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		await run({ listTimeTrackingEntries }, 'list', '--user', 'u1', '--from', '2026-11-01', '--to', '2026-11-30')

		expect(listTimeTrackingEntries).toHaveBeenCalledWith(
			{ user: 'u1', enteredOnStart: '2026-11-01', enteredOnEnd: '2026-11-30' },
			expect.objectContaining({ optFields: expect.any(String) }),
		)
		expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain('0 time entries found')
	})

	it('for-task lists a task’s entries', async () => {
		const listTimeTrackingEntriesForTask = vi.fn().mockResolvedValue([entry])
		vi.spyOn(console, 'log').mockImplementation(() => {})

		await run({ listTimeTrackingEntriesForTask }, 'for-task', 't1')

		expect(listTimeTrackingEntriesForTask).toHaveBeenCalledWith('t1', expect.anything())
	})

	it('delete is idempotent', async () => {
		const deleteTimeTrackingEntry = vi
			.fn()
			.mockRejectedValue({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})

		await run({ deleteTimeTrackingEntry }, 'delete', 'e1')

		expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain('already deleted')
	})
})

describe('time-tracking/mcp', () => {
	it('tools forward to the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: (p: any) => Promise<any>) => handlers.set(n, h) }
		const api = {
			listTimeTrackingEntries: vi.fn().mockResolvedValue([entry]),
			listTimeTrackingEntriesForTask: vi.fn().mockResolvedValue([entry]),
			getTimeTrackingEntry: vi.fn().mockResolvedValue(entry),
			createTimeTrackingEntry: vi.fn().mockResolvedValue(entry),
			updateTimeTrackingEntry: vi.fn().mockResolvedValue(entry),
			deleteTimeTrackingEntry: vi.fn().mockResolvedValue(undefined),
		}
		registerTimeTrackingEntryTools(server as never, api as never)

		await handlers.get('asana_time_entry_create')?.({
			task_gid: 't1',
			duration_minutes: 60,
			entered_on: '2026-11-17',
		})
		await handlers.get('asana_time_entry_update')?.({ time_entry_gid: 'e1', duration_minutes: 30 })
		await handlers.get('asana_time_entry_list')?.({ user_gid: 'u1', entered_on_start: '2026-11-01', limit: 5 })
		await handlers.get('asana_time_entry_list_for_task')?.({ task_gid: 't1' })
		await handlers.get('asana_time_entry_get')?.({ time_entry_gid: 'e1' })
		const del = await handlers.get('asana_time_entry_delete')?.({ time_entry_gid: 'e1' })

		expect(api.createTimeTrackingEntry).toHaveBeenCalledWith(
			't1',
			{ durationMinutes: 60, enteredOn: '2026-11-17' },
			undefined,
		)
		expect(api.updateTimeTrackingEntry).toHaveBeenCalledWith('e1', { durationMinutes: 30 }, undefined)
		expect(api.listTimeTrackingEntries).toHaveBeenCalledWith(
			{ user: 'u1', enteredOnStart: '2026-11-01' },
			expect.objectContaining({ limit: 5 }),
		)
		expect(api.listTimeTrackingEntriesForTask).toHaveBeenCalledWith('t1', expect.anything())
		expect(api.getTimeTrackingEntry).toHaveBeenCalledWith('e1', undefined)
		expect(JSON.parse(del.content[0].text)).toMatchObject({ deleted: true, gid: 'e1' })
	})
})
