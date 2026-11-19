import { createClient } from '../platform/client.js'
import type { ReadOptions } from '../platform/read-options.js'
import { createNotificationApi, type NotificationListOptions } from './api.js'
import { createAsanaNotificationGateway } from './gateway.js'

function defaultNotificationApi() {
	return createNotificationApi(createAsanaNotificationGateway(createClient()))
}

export async function listNotifications(userGid: string, workspaceGid: string, opts?: NotificationListOptions) {
	return defaultNotificationApi().listNotifications(userGid, workspaceGid, opts)
}

export async function markNotificationsRead(
	userGid: string,
	workspaceGid: string,
	notificationGids: string[],
	opts?: ReadOptions,
) {
	return defaultNotificationApi().markNotificationsRead(userGid, workspaceGid, notificationGids, opts)
}

export async function markNotificationsUnread(
	userGid: string,
	workspaceGid: string,
	notificationGids: string[],
	opts?: ReadOptions,
) {
	return defaultNotificationApi().markNotificationsUnread(userGid, workspaceGid, notificationGids, opts)
}
