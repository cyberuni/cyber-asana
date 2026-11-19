import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { statusCommand } from './cli.js'
import { createAsanaStatusGateway } from './gateway.js'
import { registerStatusTools } from './mcp.js'

describe('status create accepts opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends opt_fields', async () => {
		const create = vi
			.spyOn(Asana.StatusUpdatesApi.prototype, 'createStatusForObject')
			.mockResolvedValue({ data: { gid: 's1' } } as never)
		const gateway = createAsanaStatusGateway({} as Asana.ApiClient)

		await gateway.createStatus('p1', { status_type: 'on_track' }, { optFields: 'title,gid' })

		expect(create.mock.calls[0]?.[1]).toEqual({ opt_fields: 'title,gid' })
	})

	it('CLI --opt-fields reaches the api method, alongside --parent-type', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createStatus: vi.fn().mockResolvedValue({ gid: 's1' }) }
		const run = (...args: string[]) =>
			new Command()
				.addCommand(statusCommand(api as never))
				.parseAsync(['node', 'test', 'status', 'create', ...args], { from: 'node' })

		await run('--parent-gid', 'p1', '--status-type', 'on_track', '--opt-fields', 'a,b')
		await run('--parent-gid', 'p1', '--status-type', 'on_track', '--parent-type', 'project', '--opt-fields', 'a,b')

		expect(api.createStatus).toHaveBeenNthCalledWith(1, 'p1', { status_type: 'on_track' }, { optFields: 'a,b' })
		expect(api.createStatus).toHaveBeenNthCalledWith(
			2,
			'p1',
			{ status_type: 'on_track' },
			{ parentType: 'project', optFields: 'a,b' },
		)
	})

	it('MCP opt_fields reaches the api method', async () => {
		const handlers = new Map<string, (p: never) => Promise<unknown>>()
		const server = { tool: (name: string, _d: string, _s: unknown, h: never) => handlers.set(name, h) }
		const api = { createStatus: vi.fn().mockResolvedValue({}) }
		registerStatusTools(server as never, api as never)

		await handlers.get('asana_status_create')?.({
			parent_gid: 'p1',
			status_type: 'on_track',
			opt_fields: 'a,b',
		} as never)

		expect(api.createStatus).toHaveBeenCalledWith('p1', { status_type: 'on_track' }, { optFields: 'a,b' })
	})
})
