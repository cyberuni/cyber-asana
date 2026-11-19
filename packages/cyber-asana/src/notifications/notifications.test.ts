import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNotificationApi, type NotificationApi } from './api.js'
import { notificationCommand } from './cli.js'
import { createAsanaNotificationGateway, type NotificationGateway } from './gateway.js'
import { registerNotificationTools } from './mcp.js'

const client = {} as Asana.ApiClient

function gateway(over: Partial<NotificationGateway> = {}): NotificationGateway {
	return { listNotifications: vi.fn(), markNotificationsRead: vi.fn(), markNotificationsUnread: vi.fn(), ...over }
}

function stubApi(over: Partial<NotificationApi> = {}): NotificationApi {
	return {
		listNotifications: vi.fn(),
		markNotificationsRead: vi.fn(),
		markNotificationsUnread: vi.fn(),
		...over,
	} as NotificationApi
}

describe('notifications/gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it("lists a user's notifications for a workspace with pagination", async () => {
		const spy = vi
			.spyOn(Asana.NotificationsApi.prototype, 'getNotificationsForUser')
			.mockResolvedValue({ data: [{ gid: 'n1' }] } as never)

		const result = await createAsanaNotificationGateway(client).listNotifications('me', 'ws1', {
			limit: 20,
			optFields: 'gid,is_read',
		})

		expect(result).toEqual({ data: [{ gid: 'n1' }], next_page: null, limit: 20 })
		expect(spy).toHaveBeenCalledWith('me', 'ws1', { limit: 20, opt_fields: 'gid,is_read' })
	})

	it('marks notifications read and unread with workspace and notification_gids, returning failed GIDs', async () => {
		const read = vi
			.spyOn(Asana.NotificationsApi.prototype, 'markNotificationsReadForUser')
			.mockResolvedValue({ data: { failed_gids: ['n2'] } } as never)
		const unread = vi
			.spyOn(Asana.NotificationsApi.prototype, 'markNotificationsUnreadForUser')
			.mockResolvedValue({ data: { failed_gids: [] } } as never)
		const gw = createAsanaNotificationGateway(client)

		await expect(gw.markNotificationsRead('me', 'ws1', ['n1', 'n2'])).resolves.toEqual({ failed_gids: ['n2'] })
		await expect(gw.markNotificationsUnread('me', 'ws1', ['n1'])).resolves.toEqual({ failed_gids: [] })

		expect(read).toHaveBeenCalledWith({ data: { workspace: 'ws1', notification_gids: ['n1', 'n2'] } }, 'me', {})
		expect(unread).toHaveBeenCalledWith({ data: { workspace: 'ws1', notification_gids: ['n1'] } }, 'me', {})
	})
})

describe('notifications/api', () => {
	it('keeps only unread notifications when asked, in an array or a page', async () => {
		const items = [
			{ gid: 'n1', is_read: false },
			{ gid: 'n2', is_read: true },
		]
		const api = createNotificationApi(
			gateway({
				listNotifications: vi
					.fn()
					.mockResolvedValueOnce({ data: items, next_page: null, limit: 50 })
					.mockResolvedValueOnce(items),
			}),
		)

		await expect(api.listNotifications('me', 'ws1', { unread: true })).resolves.toEqual({
			data: [{ gid: 'n1', is_read: false }],
			next_page: null,
			limit: 50,
		})
		await expect(api.listNotifications('me', 'ws1', { unread: true })).resolves.toEqual([{ gid: 'n1', is_read: false }])
	})

	it('does not send unread to the gateway and refuses more than 50 GIDs to mark', async () => {
		const g = gateway({ listNotifications: vi.fn().mockResolvedValue([]), markNotificationsRead: vi.fn() })
		const api = createNotificationApi(g)

		await api.listNotifications('me', 'ws1', { unread: true, limit: 5 })
		expect(g.listNotifications).toHaveBeenCalledWith('me', 'ws1', { limit: 5 })

		const many = Array.from({ length: 51 }, (_, i) => `n${i}`)
		await expect(api.markNotificationsRead('me', 'ws1', many)).rejects.toThrow(/at most 50/)
		expect(g.markNotificationsRead).not.toHaveBeenCalled()
	})
})

describe('notifications/cli', () => {
	afterEach(() => vi.restoreAllMocks())

	it('notification list defaults to me, a minimal field set, and says it is beta', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listNotifications = vi
			.fn()
			.mockResolvedValue([{ gid: 'n1', is_read: false, story_resource_subtype: 'comment_added' }])
		const program = new Command().addCommand(notificationCommand(stubApi({ listNotifications })))

		await program.parseAsync(['node', 'test', 'notification', 'list', '--workspace-gid', 'ws1', '--unread'], {
			from: 'node',
		})

		expect(listNotifications).toHaveBeenCalledWith(
			'me',
			'ws1',
			expect.objectContaining({ unread: true, optFields: expect.stringContaining('is_read') }),
		)
		expect(log.mock.calls.map((c) => String(c[0])).join('\n')).toContain('n1')
		expect(program.commands[0]?.commands.find((c) => c.name() === 'list')?.description()).toMatch(/beta/i)
	})

	it('notification mark-read and mark-unread report the failed GIDs', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const markNotificationsRead = vi.fn().mockResolvedValue({ failed_gids: ['n2'] })
		const markNotificationsUnread = vi.fn().mockResolvedValue({ failed_gids: [] })
		const program = new Command().addCommand(
			notificationCommand(stubApi({ markNotificationsRead, markNotificationsUnread })),
		)

		await program.parseAsync(['node', 'test', 'notification', 'mark-read', 'n1', 'n2', '--workspace-gid', 'ws1'], {
			from: 'node',
		})
		await program.parseAsync(['node', 'test', 'notification', 'mark-unread', 'n1', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(markNotificationsRead).toHaveBeenCalledWith('me', 'ws1', ['n1', 'n2'], undefined)
		expect(markNotificationsUnread).toHaveBeenCalledWith('me', 'ws1', ['n1'], undefined)
		const text = log.mock.calls.map((c) => String(c[0])).join('\n')
		expect(text).toContain('Marked 1 of 2 notification(s) read')
		expect(text).toContain('n2')
		expect(text).toContain('Marked 1 of 1 notification(s) unread')
	})
})

describe('notifications/mcp', () => {
	it('registers list, mark_read and mark_unread and passes arguments through', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const descriptions = new Map<string, string>()
		const spyServer = {
			tool: (n: string, d: string, _s: unknown, h: any) => {
				descriptions.set(n, d)
				handlers.set(n, h)
			},
		}
		const listNotifications = vi.fn().mockResolvedValue({ data: [], next_page: null, limit: 50 })
		const markNotificationsRead = vi.fn().mockResolvedValue({ failed_gids: [] })
		const markNotificationsUnread = vi.fn().mockResolvedValue({ failed_gids: ['n9'] })
		registerNotificationTools(
			spyServer as never,
			stubApi({ listNotifications, markNotificationsRead, markNotificationsUnread }),
		)

		await handlers.get('asana_notification_list')?.({ workspace_gid: 'ws1', unread: true, limit: 10 })
		const read = await handlers.get('asana_notification_mark_read')?.({
			workspace_gid: 'ws1',
			notification_gids: ['n1'],
		})
		const unread = await handlers.get('asana_notification_mark_unread')?.({
			user_gid: 'u1',
			workspace_gid: 'ws1',
			notification_gids: ['n9'],
		})

		expect(listNotifications).toHaveBeenCalledWith('me', 'ws1', expect.objectContaining({ unread: true, limit: 10 }))
		expect(markNotificationsRead).toHaveBeenCalledWith('me', 'ws1', ['n1'], undefined)
		expect(markNotificationsUnread).toHaveBeenCalledWith('u1', 'ws1', ['n9'], undefined)
		expect(JSON.parse(read.content[0].text)).toEqual({ failed_gids: [] })
		expect(JSON.parse(unread.content[0].text)).toEqual({ failed_gids: ['n9'] })
		for (const d of descriptions.values()) expect(d).toMatch(/beta/i)
	})
})
