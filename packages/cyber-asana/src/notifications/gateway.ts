import Asana from 'asana'
import {
	collectListResponse,
	type ListResult,
	type PaginationOptions,
	toAsanaPaginationOptions,
} from '../platform/pagination.js'
import { type ReadOptions, toAsanaReadOptions } from '../platform/read-options.js'

/** What a mark call answers: the notifications Asana could not update (missing, not the caller's, deleted). */
export type MarkNotificationsResult = { failed_gids: string[] }

/** Beta endpoints: Asana may change them. */
export type NotificationGateway = {
	listNotifications(
		userGid: string,
		workspaceGid: string,
		opts?: PaginationOptions,
	): Promise<ListResult<Asana.Notification>>
	markNotificationsRead(
		userGid: string,
		workspaceGid: string,
		notificationGids: string[],
		opts?: ReadOptions,
	): Promise<MarkNotificationsResult>
	markNotificationsUnread(
		userGid: string,
		workspaceGid: string,
		notificationGids: string[],
		opts?: ReadOptions,
	): Promise<MarkNotificationsResult>
}

export function createAsanaNotificationGateway(client: Asana.ApiClient): NotificationGateway {
	const notificationsApi = new Asana.NotificationsApi(client)

	return {
		async listNotifications(userGid, workspaceGid, opts) {
			const res = await notificationsApi.getNotificationsForUser(userGid, workspaceGid, toAsanaPaginationOptions(opts))
			return await collectListResponse(res, opts)
		},
		async markNotificationsRead(userGid, workspaceGid, notificationGids, opts) {
			const res = await notificationsApi.markNotificationsReadForUser(
				{ data: { workspace: workspaceGid, notification_gids: notificationGids } },
				userGid,
				toAsanaReadOptions(opts),
			)
			return res.data
		},
		async markNotificationsUnread(userGid, workspaceGid, notificationGids, opts) {
			const res = await notificationsApi.markNotificationsUnreadForUser(
				{ data: { workspace: workspaceGid, notification_gids: notificationGids } },
				userGid,
				toAsanaReadOptions(opts),
			)
			return res.data
		},
	}
}
