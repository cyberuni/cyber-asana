import { afterEach, describe, expect, it, vi } from 'vitest'
import { registerAiStudioTools } from './mcp.js'

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	const schemas = new Map<string, Record<string, unknown>>()
	return {
		handlers,
		schemas,
		tool(name: string, _description: string, schema: Record<string, unknown>, handler: ToolHandler) {
			handlers.set(name, handler)
			schemas.set(name, schema)
		},
	}
}

function aiStudioApiStub() {
	return {
		listAiStudioRuns: vi.fn().mockResolvedValue({ data: [] }),
		listAiStudioSeats: vi.fn().mockResolvedValue({ data: [] }),
	}
}

describe('ai-studio/mcp', () => {
	afterEach(() => vi.clearAllMocks())

	it('asana_ai_studio_run_list forwards pagination, the usage window, and division', async () => {
		const api = aiStudioApiStub()
		const server = createServer()
		registerAiStudioTools(server as any, api)

		await server.handlers.get('asana_ai_studio_run_list')?.({
			workspace_gid: 'ws1',
			start_at: '2026-01-01T00:00:00Z',
			end_at: '2026-02-01T00:00:00Z',
			division_gid: 'div1',
			limit: 25,
		})

		expect(api.listAiStudioRuns).toHaveBeenCalledWith('ws1', {
			limit: 25,
			offset: undefined,
			optFields: undefined,
			fetchAll: undefined,
			maxPages: undefined,
			startAt: '2026-01-01T00:00:00Z',
			endAt: '2026-02-01T00:00:00Z',
			divisionGid: 'div1',
		})
	})

	it('asana_ai_studio_seat_list forwards the state and division filters', async () => {
		const api = aiStudioApiStub()
		const server = createServer()
		registerAiStudioTools(server as any, api)

		const result = await server.handlers.get('asana_ai_studio_seat_list')?.({
			workspace_gid: 'ws1',
			state: 'active',
			division_gid: 'div1',
		})

		expect(api.listAiStudioSeats).toHaveBeenCalledWith(
			'ws1',
			expect.objectContaining({ state: 'active', divisionGid: 'div1' }),
		)
		expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify({ data: [] }) }] })
	})

	it('does not advertise opt_fields on the usage tools', () => {
		const server = createServer()
		registerAiStudioTools(server as any, aiStudioApiStub())

		expect(server.schemas.get('asana_ai_studio_run_list')).not.toHaveProperty('opt_fields')
		expect(server.schemas.get('asana_ai_studio_seat_list')).not.toHaveProperty('opt_fields')
	})
})
