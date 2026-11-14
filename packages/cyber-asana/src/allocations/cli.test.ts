import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AllocationApi } from './api.js'
import { allocationCommand } from './cli.js'

function apiStub(): AllocationApi {
	return {
		listAllocations: vi.fn().mockResolvedValue([]),
		getAllocation: vi.fn().mockResolvedValue({ gid: 'a1' }),
		createAllocation: vi.fn().mockResolvedValue({ gid: 'a2' }),
		updateAllocation: vi.fn().mockResolvedValue({ gid: 'a1' }),
		deleteAllocation: vi.fn().mockResolvedValue(undefined),
	}
}

async function run(api: AllocationApi, ...args: string[]) {
	const program = new Command().exitOverride().addCommand(allocationCommand(api))
	// exitOverride does not reach subcommands; without it a usage error calls process.exit.
	for (const sub of program.commands[0]?.commands ?? []) sub.exitOverride().configureOutput({ writeErr: () => {} })
	await program.parseAsync(['node', 'test', 'allocation', ...args], { from: 'node' })
}

describe('allocations/cli', () => {
	afterEach(() => vi.restoreAllMocks())

	it('list passes the filters, a minimal default field set, a count summary and next steps', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiStub()
		vi.mocked(api.listAllocations).mockResolvedValue([
			{
				gid: 'a1',
				assignee: { gid: 'u1', name: 'Ann' },
				parent: { gid: 'p1', name: 'web' },
				start_date: '2026-01-05',
				end_date: '2026-01-18',
				effort: { type: 'hours', value: 40 },
			},
		] as never)

		await run(api, 'list', '--parent', 'p1', '--assignee', 'me', '--workspace', 'w1')

		expect(api.listAllocations).toHaveBeenCalledWith(
			expect.objectContaining({
				parent: 'p1',
				assignee: 'me',
				workspace: 'w1',
				optFields: expect.stringContaining('effort.value'),
			}),
		)
		const lines = log.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Ann') && l.includes('40 hours'))).toBe(true)
		expect(lines).toContain('\n1 allocation(s)')
		expect(lines.some((l) => l.includes('cyber-asana allocation create'))).toBe(true)
	})

	it('list names what was empty', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		await run(apiStub(), 'list', '--workspace', 'w1')
		expect(log.mock.calls.map((c) => String(c[0]))).toContain('0 allocations found')
	})

	it('create sends the body fields Asana documents, with a percent or hours effort', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiStub()

		await run(
			api,
			'create',
			'--assignee',
			'u1',
			'--parent',
			'p1',
			'--start-date',
			'2026-01-05',
			'--end-date',
			'2026-01-18',
			'--percent',
			'50',
		)
		await run(
			api,
			'create',
			'--assignee',
			'u1',
			'--parent',
			'p1',
			'--start-date',
			'2026-01-05',
			'--end-date',
			'2026-01-18',
			'--hours',
			'20',
		)

		expect(api.createAllocation).toHaveBeenNthCalledWith(1, {
			assignee: 'u1',
			parent: 'p1',
			start_date: '2026-01-05',
			end_date: '2026-01-18',
			effort: { type: 'percent', value: 50 },
		})
		expect(api.createAllocation).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ effort: { type: 'hours', value: 20 } }),
		)
	})

	it('create rejects --percent with --hours', async () => {
		await expect(
			run(
				apiStub(),
				'create',
				'--assignee',
				'u1',
				'--parent',
				'p1',
				'--start-date',
				'2026-01-05',
				'--end-date',
				'2026-01-18',
				'--percent',
				'50',
				'--hours',
				'20',
			),
		).rejects.toThrow(/cannot be used with/)
	})

	it('update sends only the fields given', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiStub()
		await run(api, 'update', 'a1', '--end-date', '2026-01-25', '--percent', '75')
		expect(api.updateAllocation).toHaveBeenCalledWith('a1', {
			end_date: '2026-01-25',
			effort: { type: 'percent', value: 75 },
		})
	})

	it('delete is idempotent: an allocation already gone is not an error', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiStub()
		vi.mocked(api.deleteAllocation).mockRejectedValue({
			response: { status: 404, body: { errors: [{ message: 'gone' }] } },
		})
		await run(api, 'delete', 'a1')
		expect(log.mock.calls.map((c) => String(c[0]))).toContain('Allocation a1 was already deleted')
	})
})
