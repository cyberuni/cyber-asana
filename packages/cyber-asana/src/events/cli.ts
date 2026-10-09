import { Command } from 'commander'
import { output, printCountSummary, printNextSteps, printSummary, printTable } from '../platform/cli/output.js'
import type { EventApi } from './api.js'
import { getEvents } from './default.js'
import type { EventFeed } from './feed.js'

type ChangeEvent = {
	action?: string
	created_at?: string
	type?: string
	resource?: { gid?: string; name?: string; resource_type?: string } | null
	user?: { gid?: string; name?: string } | null
	change?: { field?: string; action?: string } | null
}

function resolveEventApi(api?: EventApi | (() => EventApi)): EventApi {
	if (typeof api === 'function') return api()
	return api ?? { getEvents }
}

function describeResource(event: ChangeEvent) {
	return event.resource?.name ?? event.resource?.gid ?? ''
}

function printFeed(feed: EventFeed, resourceGid: string) {
	if (feed.sync_reset) {
		// Asana's documented "start here" handshake, not an empty result — saying
		// "0 events found" here would claim nothing changed, which is not what happened.
		printSummary(`Sync token established for ${resourceGid}. No events are returned on this call.`)
	} else {
		const events = feed.data as ChangeEvent[]
		printTable(
			events,
			[
				{ label: 'When', get: (e) => e.created_at ?? '' },
				{ label: 'Action', get: (e) => e.action ?? '' },
				{ label: 'Resource', get: (e) => describeResource(e) },
				{ label: 'Type', get: (e) => e.resource?.resource_type ?? '' },
				{ label: 'Field', get: (e) => e.change?.field ?? '' },
				{ label: 'By', get: (e) => e.user?.name ?? '' },
			],
			{ entity: 'events' },
		)
		printCountSummary(events.length, 'event(s)')
	}

	if (feed.has_more) printSummary('\nMore events are waiting — poll again with the token below.')
	if (feed.sync) {
		printSummary(`\nSync token: ${feed.sync}`)
		printNextSteps([`cyber-asana event list ${resourceGid} --sync ${feed.sync} — changes since this call`])
	}
}

export function eventCommand(api?: EventApi | (() => EventApi)) {
	const cmd = new Command('event').description('Read the Asana change feed for a task, project, or goal')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana event list <project-gid>                  # first call: returns a sync token, no events',
			'  cyber-asana event list <project-gid> --sync <token>   # changes since that token',
			'  cyber-asana event list <task-gid> --sync <token> --toon',
			'',
			'The sync token is not stored — pass the token from the previous response back in.',
			'Asana caps one token at 100 events; when has_more is true, poll again immediately.',
		].join('\n'),
	)

	cmd
		.command('list <resource-gid>')
		.description('List changes to a task, project, or goal since a sync token')
		.option('--sync <token>', 'Sync token from a previous call; omit on the first call')
		.option('--opt-fields <fields>', 'Comma-separated optional Asana fields to include')
		.action(async (resourceGid: string, opts: { sync?: string; optFields?: string }) => {
			const data = await resolveEventApi(api).getEvents(resourceGid, {
				...(opts.sync !== undefined && { sync: opts.sync }),
				...(opts.optFields !== undefined && { optFields: opts.optFields }),
			})
			output(data, () => printFeed(data, resourceGid))
		})

	return cmd
}
