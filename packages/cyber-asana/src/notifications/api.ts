import type { ListResult, PaginationOptions } from '../platform/pagination.js'
import type { ReadOptions } from '../platform/read-options.js'
import type { NotificationGateway } from './gateway.js'

export type { MarkNotificationsResult } from './gateway.js'

export type NotificationApi = ReturnType<typeof createNotificationApi>

export type NotificationListOptions = PaginationOptions & {
	/** Keep only unread notifications. Asana has no such filter, so it applies to each page after the fetch. */
	unread?: boolean
}

/** Asana takes 1 to 50 notification GIDs per mark call. */
export const MAX_MARK_NOTIFICATIONS = 50

function assertGids(notificationGids: string[]) {
	if (notificationGids.length === 0) throw new Error('Give at least one notification GID')
	if (notificationGids.length > MAX_MARK_NOTIFICATIONS) {
		throw new Error(
			`Asana marks at most ${MAX_MARK_NOTIFICATIONS} notifications per call; got ${notificationGids.length}`,
		)
	}
}

function keepUnread<T extends { is_read?: boolean }>(result: ListResult<T>): ListResult<T> {
	const unread = (n: T) => n.is_read !== true
	return Array.isArray(result) ? result.filter(unread) : { ...result, data: result.data.filter(unread) }
}

export function createNotificationApi(gateway: NotificationGateway) {
	return {
		async listNotifications(userGid: string, workspaceGid: string, opts?: NotificationListOptions) {
			const { unread, ...pagination } = opts ?? {}
			const result = await gateway.listNotifications(userGid, workspaceGid, opts ? pagination : undefined)
			return unread ? keepUnread(result) : result
		},
		async markNotificationsRead(userGid: string, workspaceGid: string, notificationGids: string[], opts?: ReadOptions) {
			assertGids(notificationGids)
			return gateway.markNotificationsRead(userGid, workspaceGid, notificationGids, opts)
		},
		async markNotificationsUnread(
			userGid: string,
			workspaceGid: string,
			notificationGids: string[],
			opts?: ReadOptions,
		) {
			assertGids(notificationGids)
			return gateway.markNotificationsUnread(userGid, workspaceGid, notificationGids, opts)
		},
	}
}
