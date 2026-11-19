import { Command } from 'commander'
import {
	addGidOption,
	addPaginationOptions,
	addReadOptions,
	type CliGidOptions,
	itemsForOutput,
	normalizedGid,
	paginationOptionsFromCli,
	printNextPageHint,
	readOptionsFromCli,
	requiredGid,
} from '../platform/cli/options.js'
import { output, printCountSummary, printNextSteps, printTable } from '../platform/cli/output.js'
import type { MarkNotificationsResult, NotificationApi } from './api.js'
import { listNotifications, markNotificationsRead, markNotificationsUnread } from './default.js'

const BETA = 'Beta endpoint: Asana may change it.'

type Notification = {
	gid: string
	is_read?: boolean
	created_at?: string
	story_resource_subtype?: string
	created_by?: { name?: string } | null
	work_objects?: Array<{ name?: string }>
}

// Minimal default schema — principle 2. Just the fields the table renders.
const NOTIFICATION_LIST_FIELDS = 'gid,is_read,created_at,story_resource_subtype,created_by.name,work_objects.name'

function resolveNotificationApi(api?: NotificationApi | (() => NotificationApi)): NotificationApi {
	if (typeof api === 'function') return api()
	return api ?? { listNotifications, markNotificationsRead, markNotificationsUnread }
}

/** Asana takes `me` wherever a user GID goes: an unscoped call reads the caller's own inbox. */
function userGidOrMe(opts: CliGidOptions) {
	return normalizedGid(opts, 'user') ?? 'me'
}

type GidOpts = { user?: string; userGid?: string; workspace?: string; workspaceGid?: string }

function addScopeOptions<T extends Command>(cmd: T) {
	return addGidOption(
		addGidOption(cmd, 'user', 'User GID (default: the authenticated user; only your own inbox is readable)'),
		'workspace',
		'Workspace GID',
	)
}

function reportMark(result: MarkNotificationsResult, requested: string[], verb: 'read' | 'unread') {
	const failed = result.failed_gids ?? []
	console.log(`Marked ${requested.length - failed.length} of ${requested.length} notification(s) ${verb}`)
	if (failed.length > 0) console.log(`Not updated (missing, not yours, or deleted): ${failed.join(', ')}`)
}

export function notificationCommand(api?: NotificationApi | (() => NotificationApi)) {
	const cmd = new Command('notification').description(`Read and clear a user's Asana inbox. ${BETA}`)

	cmd.addHelpText(
		'after',
		[
			'',
			`${BETA}`,
			'Examples:',
			'  cyber-asana notification list --workspace-gid <gid> --unread',
			'  cyber-asana notification mark-read <notification-gid> [<gid>...] --workspace-gid <gid>',
			'  cyber-asana notification mark-unread <notification-gid> --workspace-gid <gid>',
		].join('\n'),
	)

	addPaginationOptions(
		addScopeOptions(cmd.command('list').description(`List a user's inbox notifications, newest first. ${BETA}`)).option(
			'--unread',
			'Only unread notifications (filtered after each page is fetched, so a page can hold fewer than --limit)',
		),
	).action(async (opts: GidOpts & { unread?: boolean; limit?: number; offset?: string; optFields?: string }) => {
		const pagination = paginationOptionsFromCli(opts)
		pagination.optFields ??= NOTIFICATION_LIST_FIELDS
		const data = await resolveNotificationApi(api).listNotifications(
			userGidOrMe(opts),
			requiredGid(opts, 'workspace', 'Workspace GID'),
			{ ...pagination, ...(opts.unread && { unread: true }) },
		)
		output(data, () => {
			const items = itemsForOutput(data) as Notification[]
			printTable(
				items,
				[
					{ label: 'ID', get: (n) => n.gid },
					{ label: 'Read', get: (n) => (n.is_read === undefined ? '' : String(n.is_read)) },
					{ label: 'Type', get: (n) => n.story_resource_subtype ?? '' },
					{ label: 'From', get: (n) => n.created_by?.name ?? '' },
					{ label: 'About', get: (n) => n.work_objects?.[0]?.name ?? '' },
					{ label: 'At', get: (n) => n.created_at ?? '' },
				],
				{ entity: 'notifications' },
			)
			printCountSummary(items.length, 'notification(s)')
			printNextPageHint(data)
			printNextSteps([
				'cyber-asana notification mark-read <gid>... --workspace-gid <gid> — clear handled notifications',
			])
		})
	})

	for (const [name, verb, call] of [
		['mark-read', 'read', 'markNotificationsRead'],
		['mark-unread', 'unread', 'markNotificationsUnread'],
	] as const) {
		addReadOptions(
			addScopeOptions(
				cmd
					.command(`${name} <notification-gids...>`)
					.description(
						`Mark notifications ${verb}; Asana takes 1 to 50 and reports the ones it could not update. ${BETA}`,
					),
			),
		).action(async (notificationGids: string[], opts: GidOpts & { optFields?: string }) => {
			const result = await resolveNotificationApi(api)[call](
				userGidOrMe(opts),
				requiredGid(opts, 'workspace', 'Workspace GID'),
				notificationGids,
				readOptionsFromCli(opts),
			)
			output(result, () => reportMark(result, notificationGids, verb))
		})
	}

	return cmd
}
