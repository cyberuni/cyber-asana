import { afterEach, describe, expect, it, vi } from 'vitest'

const getEventsMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return { ...actual, getEvents: getEventsMock }
})

const { registerEventTools } = await import('./mcp.js')

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

describe('events/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_event_list forwards the resource gid and sync token', async () => {
		getEventsMock.mockResolvedValue({ data: [], sync: 'tok-2', has_more: false, sync_reset: false })
		const server = createServer()
		registerEventTools(server as any)

		await server.handlers.get('asana_event_list')?.({ resource_gid: 'proj1', sync: 'tok-1' })

		expect(getEventsMock).toHaveBeenCalledWith('proj1', { sync: 'tok-1' })
	})

	it('asana_event_list omits the sync token on a first call', async () => {
		getEventsMock.mockResolvedValue({ data: [], sync: 'tok-1', has_more: false, sync_reset: true })
		const server = createServer()
		registerEventTools(server as any)

		await server.handlers.get('asana_event_list')?.({ resource_gid: 'proj1' })

		expect(getEventsMock).toHaveBeenCalledWith('proj1', {})
	})

	it('asana_event_list serializes the feed, sync token and all', async () => {
		const feed = { data: [{ action: 'changed' }], sync: 'tok-2', has_more: true, sync_reset: false }
		getEventsMock.mockResolvedValue(feed)
		const server = createServer()
		registerEventTools(server as any)

		const result = await server.handlers.get('asana_event_list')?.({ resource_gid: 'proj1', sync: 'tok-1' })

		expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(feed) }] })
	})

	it('asana_event_list uses an injected api when one is given', async () => {
		const getEvents = vi.fn().mockResolvedValue({ data: [], sync: 'tok-2', has_more: false, sync_reset: false })
		const server = createServer()
		registerEventTools(server as any, { getEvents })

		await server.handlers.get('asana_event_list')?.({ resource_gid: 'proj1', opt_fields: 'action,resource.name' })

		expect(getEvents).toHaveBeenCalledWith('proj1', { optFields: 'action,resource.name' })
	})
})
