import { afterEach, describe, expect, it, vi } from 'vitest'

const listOooEntriesMock = vi.fn()
const getOooEntryMock = vi.fn()
const createOooEntryMock = vi.fn()
const updateOooEntryMock = vi.fn()
const deleteOooEntryMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listOooEntries: listOooEntriesMock,
		getOooEntry: getOooEntryMock,
		createOooEntry: createOooEntryMock,
		updateOooEntry: updateOooEntryMock,
		deleteOooEntry: deleteOooEntryMock,
	}
})

const { registerOooTools } = await import('./mcp.js')

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

describe('ooo/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_ooo_list forwards pagination options and the date window', async () => {
		listOooEntriesMock.mockResolvedValue({ data: [] })
		const server = createServer()
		registerOooTools(server as any)

		await server.handlers.get('asana_ooo_list')?.({
			user_gid: 'user1',
			workspace_gid: 'ws1',
			start_date: '2026-01-01',
			end_date: '2026-01-31',
			limit: 25,
			opt_fields: 'gid,start_date',
		})

		expect(listOooEntriesMock).toHaveBeenCalledWith('user1', 'ws1', {
			limit: 25,
			optFields: 'gid,start_date',
			startDate: '2026-01-01',
			endDate: '2026-01-31',
		})
	})

	it('asana_ooo_list defaults the user to the authenticated user', async () => {
		listOooEntriesMock.mockResolvedValue({ data: [] })
		const server = createServer()
		registerOooTools(server as any)

		await server.handlers.get('asana_ooo_list')?.({ workspace_gid: 'ws1' })

		expect(listOooEntriesMock).toHaveBeenCalledWith('me', 'ws1', {})
	})

	it('asana_ooo_get reads a single entry', async () => {
		getOooEntryMock.mockResolvedValue({ gid: 'ooo1' })
		const server = createServer()
		registerOooTools(server as any)

		const result = await server.handlers.get('asana_ooo_get')?.({ ooo_entry_gid: 'ooo1' })

		expect(getOooEntryMock).toHaveBeenCalledWith('ooo1', undefined)
		expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify({ gid: 'ooo1' }) }] })
	})

	it('asana_ooo_create defaults the user and forwards the date window', async () => {
		createOooEntryMock.mockResolvedValue({ gid: 'ooo1' })
		const server = createServer()
		registerOooTools(server as any)

		await server.handlers.get('asana_ooo_create')?.({
			workspace_gid: 'ws1',
			start_date: '2026-01-01',
			end_date: '2026-01-15',
		})

		expect(createOooEntryMock).toHaveBeenCalledWith('me', 'ws1', {
			start_date: '2026-01-01',
			end_date: '2026-01-15',
		})
	})

	it('asana_ooo_update forwards only the fields given', async () => {
		updateOooEntryMock.mockResolvedValue({ gid: 'ooo1' })
		const server = createServer()
		registerOooTools(server as any)

		await server.handlers.get('asana_ooo_update')?.({ ooo_entry_gid: 'ooo1', end_date: '2026-01-20' })

		expect(updateOooEntryMock).toHaveBeenCalledWith('ooo1', { end_date: '2026-01-20' })
	})

	it('asana_ooo_delete removes an entry', async () => {
		deleteOooEntryMock.mockResolvedValue(undefined)
		const server = createServer()
		registerOooTools(server as any)

		const result = await server.handlers.get('asana_ooo_delete')?.({ ooo_entry_gid: 'ooo1' })

		expect(deleteOooEntryMock).toHaveBeenCalledWith('ooo1')
		expect(result).toEqual({
			content: [{ type: 'text', text: JSON.stringify({ ok: true, deleted: 'ooo1' }) }],
		})
	})

	it('ooo tools can use an injected api dependency', async () => {
		const injectedListOooEntries = vi.fn().mockResolvedValue({ data: [] })
		const server = createServer()
		registerOooTools(server as any, {
			listOooEntries: injectedListOooEntries,
			getOooEntry: vi.fn(),
			createOooEntry: vi.fn(),
			updateOooEntry: vi.fn(),
			deleteOooEntry: vi.fn(),
		})

		await server.handlers.get('asana_ooo_list')?.({ user_gid: 'user1', workspace_gid: 'ws1' })

		expect(injectedListOooEntries).toHaveBeenCalledWith('user1', 'ws1', {})
	})
})
