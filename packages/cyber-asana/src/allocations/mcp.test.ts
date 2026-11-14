import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AllocationApi } from './api.js'
import { registerAllocationTools } from './mcp.js'

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

function apiStub(): AllocationApi {
	return {
		listAllocations: vi.fn().mockResolvedValue({ data: [] }),
		getAllocation: vi.fn().mockResolvedValue({ gid: 'a1' }),
		createAllocation: vi.fn().mockResolvedValue({ gid: 'a2' }),
		updateAllocation: vi.fn().mockResolvedValue({ gid: 'a1' }),
		deleteAllocation: vi.fn().mockResolvedValue(undefined),
	}
}

describe('allocations/mcp', () => {
	afterEach(() => vi.clearAllMocks())

	it('registers the five asana_allocation_* tools', () => {
		const server = createServer()
		registerAllocationTools(server as any, apiStub())
		expect([...server.handlers.keys()].sort()).toEqual([
			'asana_allocation_create',
			'asana_allocation_delete',
			'asana_allocation_get',
			'asana_allocation_list',
			'asana_allocation_update',
		])
	})

	it('asana_allocation_list forwards the filters and pagination', async () => {
		const api = apiStub()
		const server = createServer()
		registerAllocationTools(server as any, api)

		await server.handlers.get('asana_allocation_list')?.({
			parent_gid: 'p1',
			assignee_gid: 'u1',
			workspace_gid: 'w1',
			limit: 25,
		})

		expect(api.listAllocations).toHaveBeenCalledWith(
			expect.objectContaining({ parent: 'p1', assignee: 'u1', workspace: 'w1', limit: 25 }),
		)
	})

	it('asana_allocation_create and update build the effort object', async () => {
		const api = apiStub()
		const server = createServer()
		registerAllocationTools(server as any, api)

		await server.handlers.get('asana_allocation_create')?.({
			assignee_gid: 'u1',
			parent_gid: 'p1',
			start_date: '2026-01-05',
			end_date: '2026-01-18',
			effort_type: 'percent',
			effort_value: 50,
		})
		await server.handlers.get('asana_allocation_update')?.({
			allocation_gid: 'a1',
			effort_type: 'hours',
			effort_value: 8,
		})

		expect(api.createAllocation).toHaveBeenCalledWith({
			assignee: 'u1',
			parent: 'p1',
			start_date: '2026-01-05',
			end_date: '2026-01-18',
			effort: { type: 'percent', value: 50 },
		})
		expect(api.updateAllocation).toHaveBeenCalledWith('a1', { effort: { type: 'hours', value: 8 } })
	})

	it('asana_allocation_delete acknowledges', async () => {
		const server = createServer()
		registerAllocationTools(server as any, apiStub())
		const res = await server.handlers.get('asana_allocation_delete')?.({ allocation_gid: 'a1' })
		expect(JSON.parse(res.content[0].text)).toMatchObject({ ok: true })
	})
})
