import { afterEach, describe, expect, it, vi } from 'vitest'

const listUsersMock = vi.fn()
const getUserMock = vi.fn()
const getMeMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listUsers: listUsersMock,
		getUser: getUserMock,
		getMe: getMeMock,
	}
})

const { registerUserTools } = await import('./mcp.js')

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

describe('users/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_user_list forwards workspace gid and pagination options', async () => {
		listUsersMock.mockResolvedValue({ data: [{ gid: 'user1', name: 'Alice' }], next_page: null })
		const server = createServer()
		registerUserTools(server as any)

		await server.handlers.get('asana_user_list')?.({
			workspace_gid: 'ws1',
			offset: 'abc',
			opt_fields: 'gid,name,email',
		})

		expect(listUsersMock).toHaveBeenCalledWith('ws1', {
			offset: 'abc',
			optFields: 'gid,name,email',
		})
	})

	it('asana_user_get forwards user gid', async () => {
		getUserMock.mockResolvedValue({ gid: 'user1', name: 'Alice' })
		const server = createServer()
		registerUserTools(server as any)

		await server.handlers.get('asana_user_get')?.({ user_gid: 'user1' })

		expect(getUserMock).toHaveBeenCalledWith('user1')
	})

	it('asana_user_me calls getMe', async () => {
		getMeMock.mockResolvedValue({ gid: 'me', name: 'Me' })
		const server = createServer()
		registerUserTools(server as any)

		await server.handlers.get('asana_user_me')?.({})

		expect(getMeMock).toHaveBeenCalledWith()
	})

	it('user tools can use injected dependencies', async () => {
		const injectedGetMe = vi.fn().mockResolvedValue({ gid: 'me', name: 'Me' })
		const server = createServer()
		registerUserTools(server as any, {
			listUsers: vi.fn(),
			getUser: vi.fn(),
			getMe: injectedGetMe,
		})

		await server.handlers.get('asana_user_me')?.({})

		expect(injectedGetMe).toHaveBeenCalledWith()
	})
})
