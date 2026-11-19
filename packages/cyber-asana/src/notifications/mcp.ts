import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { paginationOptions, paginationParams, readOptions, readParams } from '../platform/mcp/options.js'
import type { NotificationApi } from './api.js'
import { listNotifications, markNotificationsRead, markNotificationsUnread } from './default.js'

const BETA = 'Beta endpoint: Asana may change it.'

function resolveNotificationApi(api?: NotificationApi | (() => NotificationApi)): NotificationApi {
	if (typeof api === 'function') return api()
	return api ?? { listNotifications, markNotificationsRead, markNotificationsUnread }
}

const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value) }] })

const scope = {
	user_gid: z.string().optional().describe('User GID (default: the authenticated user; only your own inbox works)'),
	workspace_gid: z.string().describe('Workspace GID the notifications belong to'),
}

export function registerNotificationTools(server: McpServer, api?: NotificationApi | (() => NotificationApi)) {
	server.tool(
		'asana_notification_list',
		`List a user's Asana inbox notifications, newest first. ${BETA}`,
		{
			...scope,
			unread: z
				.boolean()
				.optional()
				.describe(
					'Only unread notifications (filtered after each page is fetched, so a page can hold fewer than limit)',
				),
			...paginationParams,
		},
		async ({ user_gid, workspace_gid, unread, ...params }) =>
			json(
				await resolveNotificationApi(api).listNotifications(user_gid ?? 'me', workspace_gid, {
					...paginationOptions(params),
					...(unread && { unread: true }),
				}),
			),
	)

	server.tool(
		'asana_notification_mark_read',
		`Mark 1 to 50 Asana notifications read. Returns failed_gids, the ones Asana could not update. ${BETA}`,
		{
			...scope,
			notification_gids: z.array(z.string()).min(1).max(50).describe('Notification GIDs (1 to 50)'),
			...readParams,
		},
		async ({ user_gid, workspace_gid, notification_gids, ...params }) =>
			json(
				await resolveNotificationApi(api).markNotificationsRead(
					user_gid ?? 'me',
					workspace_gid,
					notification_gids,
					readOptions(params),
				),
			),
	)

	server.tool(
		'asana_notification_mark_unread',
		`Mark 1 to 50 Asana notifications unread. Returns failed_gids, the ones Asana could not update. ${BETA}`,
		{
			...scope,
			notification_gids: z.array(z.string()).min(1).max(50).describe('Notification GIDs (1 to 50)'),
			...readParams,
		},
		async ({ user_gid, workspace_gid, notification_gids, ...params }) =>
			json(
				await resolveNotificationApi(api).markNotificationsUnread(
					user_gid ?? 'me',
					workspace_gid,
					notification_gids,
					readOptions(params),
				),
			),
	)
}
