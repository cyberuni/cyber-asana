import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNotificationApi } from './api.js'
import { notificationCommand } from './cli.js'
import { createAsanaNotificationGateway } from './gateway.js'
import { registerNotificationTools } from './mcp.js'

const read = { optFields: 'a,b' }

describe('notification mark calls accept opt_fields', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway sends opt_fields', async () => {
		const ok = { data: { failed_gids: [] } } as never
		const markRead = vi.spyOn(Asana.NotificationsApi.prototype, 'markNotificationsReadForUser').mockResolvedValue(ok)
		const markUnread = vi
			.spyOn(Asana.NotificationsApi.prototype, 'markNotificationsUnreadForUser')
			.mockResolvedValue(ok)
		const gateway = createAsanaNotificationGateway({} as Asana.ApiClient)

		await gateway.markNotificationsRead('me', 'ws1', ['n1'], read)
		await gateway.markNotificationsUnread('me', 'ws1', ['n1'], read)

		expect(markRead.mock.calls[0]?.[2]).toEqual({ opt_fields: 'a,b' })
		expect(markUnread.mock.calls[0]?.[2]).toEqual({ opt_fields: 'a,b' })
	})

	it('api forwards the options to the gateway', async () => {
		const gateway = { markNotificationsRead: vi.fn(), markNotificationsUnread: vi.fn() }
		const api = createNotificationApi(gateway as never)

		await api.markNotificationsRead('me', 'ws1', ['n1'], read)
		await api.markNotificationsUnread('me', 'ws1', ['n1'], read)

		expect(gateway.markNotificationsRead).toHaveBeenCalledWith('me', 'ws1', ['n1'], read)
		expect(gateway.markNotificationsUnread).toHaveBeenCalledWith('me', 'ws1', ['n1'], read)
	})

	it('CLI --opt-fields reaches the api method', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = {
			markNotificationsRead: vi.fn().mockResolvedValue({ failed_gids: [] }),
			markNotificationsUnread: vi.fn().mockResolvedValue({ failed_gids: [] }),
		}
		const run = (...args: string[]) =>
			new Command()
				.addCommand(notificationCommand(api as never))
				.parseAsync(['node', 'test', 'notification', ...args], { from: 'node' })

		await run('mark-read', 'n1', '--workspace-gid', 'ws1', '--opt-fields', 'a,b')
		await run('mark-unread', 'n1', '--workspace-gid', 'ws1', '--opt-fields', 'a,b')

		expect(api.markNotificationsRead).toHaveBeenCalledWith('me', 'ws1', ['n1'], read)
		expect(api.markNotificationsUnread).toHaveBeenCalledWith('me', 'ws1', ['n1'], read)
	})

	it('MCP opt_fields reaches the api method', async () => {
		const handlers = new Map<string, (p: never) => Promise<unknown>>()
		const server = { tool: (name: string, _d: string, _s: unknown, h: never) => handlers.set(name, h) }
		const api = {
			markNotificationsRead: vi.fn().mockResolvedValue({}),
			markNotificationsUnread: vi.fn().mockResolvedValue({}),
		}
		registerNotificationTools(server as never, api as never)
		const p = { workspace_gid: 'ws1', notification_gids: ['n1'], opt_fields: 'a,b' } as never

		await handlers.get('asana_notification_mark_read')?.(p)
		await handlers.get('asana_notification_mark_unread')?.(p)

		expect(api.markNotificationsRead).toHaveBeenCalledWith('me', 'ws1', ['n1'], read)
		expect(api.markNotificationsUnread).toHaveBeenCalledWith('me', 'ws1', ['n1'], read)
	})
})
