import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { userCommand } from './cli.js'
import { createAsanaUserGateway } from './gateway.js'
import { registerUserTools } from './mcp.js'

describe('user parameters: gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('getUser and getMe send workspace only when given', async () => {
		const getUser = vi.spyOn(Asana.UsersApi.prototype, 'getUser').mockResolvedValue({ data: { gid: 'u1' } } as never)
		const gateway = createAsanaUserGateway({} as Asana.ApiClient)
		await gateway.getUser('u1', { optFields: 'gid', workspaceGid: 'ws1' })
		expect(getUser).toHaveBeenLastCalledWith('u1', { opt_fields: 'gid', workspace: 'ws1' })
		await gateway.getMe({ workspaceGid: 'ws1' })
		expect(getUser).toHaveBeenLastCalledWith('me', { workspace: 'ws1' })
		await gateway.getUser('u1')
		expect(getUser).toHaveBeenLastCalledWith('u1', {})
	})

	it('listUsers sends team alongside the workspace', async () => {
		const getUsers = vi
			.spyOn(Asana.UsersApi.prototype, 'getUsers')
			.mockResolvedValue({ data: [], _response: { next_page: null } } as never)
		await createAsanaUserGateway({} as Asana.ApiClient).listUsers('ws1', { team: 't1' })
		expect(getUsers).toHaveBeenCalledWith(expect.objectContaining({ workspace: 'ws1', team: 't1' }))
	})
})

describe('user parameters: cli', () => {
	afterEach(() => vi.restoreAllMocks())

	async function run(args: string[], api: Record<string, unknown>) {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		await new Command().addCommand(userCommand(api as never)).parseAsync(['node', 'test', 'user', ...args], {
			from: 'node',
		})
	}

	it('user get and user me take --workspace-gid, and send nothing without it', async () => {
		const getUser = vi.fn().mockResolvedValue({ gid: 'u1' })
		const getMe = vi.fn().mockResolvedValue({ gid: 'u1' })
		await run(['get', 'u1', '--workspace-gid', 'ws1'], { getUser })
		expect(getUser).toHaveBeenCalledWith('u1', { workspaceGid: 'ws1' })
		await run(['me', '--workspace', 'ws2'], { getMe })
		expect(getMe).toHaveBeenCalledWith({ workspaceGid: 'ws2' })
		await run(['me'], { getMe })
		expect(getMe).toHaveBeenLastCalledWith(undefined)
	})

	it('user list --team reaches the api', async () => {
		const listUsers = vi.fn().mockResolvedValue({ data: [], next_page: null })
		await run(['list', '--workspace-gid', 'ws1', '--team', 't1'], { listUsers })
		expect(listUsers).toHaveBeenCalledWith('ws1', expect.objectContaining({ team: 't1' }))
	})
})

describe('user parameters: mcp', () => {
	function setup(api: Record<string, unknown>) {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		registerUserTools(
			{ tool: (n: string, _d: string, _s: unknown, h: any) => handlers.set(n, h) } as never,
			api as never,
		)
		return handlers
	}

	it('asana_user_get and asana_user_me forward workspace_gid', async () => {
		const getUser = vi.fn().mockResolvedValue({})
		const getMe = vi.fn().mockResolvedValue({})
		const handlers = setup({ getUser, getMe })
		await handlers.get('asana_user_get')?.({ user_gid: 'u1', workspace_gid: 'ws1' })
		expect(getUser).toHaveBeenCalledWith('u1', { workspaceGid: 'ws1' })
		await handlers.get('asana_user_me')?.({ workspace_gid: 'ws1' })
		expect(getMe).toHaveBeenCalledWith({ workspaceGid: 'ws1' })
	})

	it('asana_user_list forwards team_gid', async () => {
		const listUsers = vi.fn().mockResolvedValue({ data: [] })
		await setup({ listUsers }).get('asana_user_list')?.({ workspace_gid: 'ws1', team_gid: 't1' })
		expect(listUsers).toHaveBeenCalledWith('ws1', expect.objectContaining({ team: 't1' }))
	})
})
