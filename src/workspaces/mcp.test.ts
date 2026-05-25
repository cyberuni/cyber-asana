import { afterEach, describe, expect, it, vi } from 'vitest'

const listWorkspacesMock = vi.fn()
const getWorkspaceMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listWorkspaces: listWorkspacesMock,
		getWorkspace: getWorkspaceMock,
	}
})

const { registerWorkspaceTools } = await import('./mcp.js')

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

describe('workspaces/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_workspace_list forwards pagination options', async () => {
		listWorkspacesMock.mockResolvedValue({ data: [{ gid: 'ws1', name: 'Acme' }], next_page: null, limit: 100 })
		const server = createServer()
		registerWorkspaceTools(server as any)

		await server.handlers.get('asana_workspace_list')?.({
			limit: 50,
			opt_fields: 'gid,name',
		})

		expect(listWorkspacesMock).toHaveBeenCalledWith({
			limit: 50,
			optFields: 'gid,name',
		})
	})

	it('asana_workspace_get forwards workspace gid', async () => {
		getWorkspaceMock.mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const server = createServer()
		registerWorkspaceTools(server as any)

		await server.handlers.get('asana_workspace_get')?.({ workspace_gid: 'ws1' })

		expect(getWorkspaceMock).toHaveBeenCalledWith('ws1')
	})

	it('workspace tools can use injected dependencies', async () => {
		const injectedGetWorkspace = vi.fn().mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const server = createServer()
		registerWorkspaceTools(server as any, {
			listWorkspaces: vi.fn(),
			getWorkspace: injectedGetWorkspace,
		})

		await server.handlers.get('asana_workspace_get')?.({ workspace_gid: 'ws1' })

		expect(injectedGetWorkspace).toHaveBeenCalledWith('ws1')
	})
})
