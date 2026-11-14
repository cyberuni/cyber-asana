import type { Command } from 'commander'
import { output, printCountSummary, printFields, printNextSteps } from '../../../platform/cli/output.js'
import { CodedConfigError } from '../../../platform/coded-error.js'
import {
	addSprintOptions,
	type ResolveApi,
	resolveApi,
	type SprintFlags,
	sprintInput,
	storeOptions,
} from '../../cli.js'
import type { DashboardEntry } from '../../dashboard-api.js'
import { renderDashboardPage } from './page.js'
import { writeDashboardPage } from './page-file.js'

type Tracked = { story: boolean; task: boolean }
type Points = { story: number; task: number }
type Ok<K extends DashboardEntry['key']> = Extract<DashboardEntry, { key: K; status: 'ok' }>['data']

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`
const rate = (value: number | null) => (value === null ? 'n/a' : `${value}%`)

function points(p: Points, tracked: Tracked): string {
	const parts = [
		...(tracked.story ? [`${p.story} story points`] : []),
		...(tracked.task ? [`${p.task} task points`] : []),
	]
	return parts.length ? ` — ${parts.join(', ')}` : ''
}

/** One short block per report: the figures a dashboard reader scans, not each report's full detail. */
const summaries: { [K in DashboardEntry['key']]?: (data: never) => string[] } = {
	sprint: (r: Ok<'sprint'>) => {
		const t = r.points_tracked
		return [
			`${r.sprint.name} (${r.sprint.start} to ${r.sprint.end})`,
			r.committed.source === 'unavailable'
				? 'Committed: unavailable (no commitment snapshot)'
				: `Committed: ${plural(r.committed.count, 'task')}${points(r.committed.points, t)} (${r.committed.source})`,
			`Completed: ${plural(r.completed.count, 'task')}${points(r.completed.points, t)}`,
			`Added: ${plural(r.added.count, 'task')}${points(r.added.points, t)}`,
			r.removed === null
				? 'Removed: unavailable'
				: `Removed: ${plural(r.removed.count, 'task')}${points(r.removed.points, t)}`,
			`Completion rate: ${rate(r.completion_rate.count)} by count${t.story ? `; ${rate(r.completion_rate.story)} story points` : ''}${t.task ? `; ${rate(r.completion_rate.task)} task points` : ''}`,
		]
	},
	health: (r: Ok<'health'>) => [
		`${plural(r.counts.error, 'error')}, ${plural(r.counts.warning, 'warning')}`,
		...r.findings.flatMap((f) => [`[${f.level}] ${f.check}  ${f.message}`, `  fix: ${f.fix}`]),
	],
	workload: (r: Ok<'workload'>) => {
		const t = r.team
		return [
			`${t.people} people, ${t.effort_hours.total} h of load; capacity ${t.capacity_hours === null ? 'unknown' : `${t.capacity_hours} h`}${t.utilization_pct === null ? '' : `, ${t.utilization_pct}% used`}${t.capacity_unknown ? ` (${t.capacity_unknown} without known capacity)` : ''}`,
			...r.people
				.filter((p) => p.flag === 'over' || p.flag === 'under')
				.map((p) => `${p.person.name ?? p.person.gid}: ${p.flag} (${p.utilization_pct ?? 'n/a'}%)`),
		]
	},
	velocity: (r: Ok<'velocity'>) =>
		r.mean
			? [
					`last ${r.window} closed sprints`,
					`mean per sprint: ${r.mean.count} tasks${points({ story: r.mean.story, task: r.mean.task }, r.points_tracked)}`,
				]
			: ['no closed sprint yet'],
	retro: (r: Ok<'retro'>) => [
		`${plural(r.carry_over.length, 'carry-over task')}; ${plural(r.scope_change.added.count, 'task')} added; ${r.blocked.tasks.length} blocked`,
	],
	standup: (r: Ok<'standup'>) => [
		`${r.member.name ?? r.member.gid}: ${r.done.count} done, ${r.today.count} for today, ${r.blocked.count} blocked`,
	],
}

const TITLES: Record<string, string> = {
	sprint: 'Sprint report',
	health: 'Health',
	workload: 'Workload',
	velocity: 'Velocity',
	retro: 'Retro',
	standup: 'Standup',
}

function printEntry(entry: DashboardEntry) {
	const title = TITLES[entry.key] ?? entry.key
	if (entry.status === 'failed') {
		console.log(`\n${title}: failed (${entry.error.code}): ${entry.error.message}`)
		if (entry.error.hint) console.log(`  ${entry.error.hint}`)
		return
	}
	if (entry.status === 'unsupported') {
		console.log(`\n${title}: unsupported: ${entry.reason}`)
		return
	}
	console.log(`\n${title}`)
	const lines = (summaries[entry.key] as ((data: unknown) => string[]) | undefined)?.(entry.data) ?? []
	for (const line of lines) console.log(`  ${line}`)
	for (const note of (entry.data as { notes?: string[] }).notes ?? []) console.log(`  Note: ${note}`)
}

/** `report dashboard` (D2.1): the reports `cyber-asana.dashboard` lists, in one output. */
export function addDashboardCommand(cmd: Command, api?: ResolveApi) {
	addSprintOptions(
		cmd
			.command('dashboard')
			.description(
				'The dashboard: the reports cyber-asana.dashboard lists, in order, with a status from the health findings',
			)
			.option(
				'--page <path>',
				'Write the dashboard as one self-contained HTML file to <path> (local file only; publishes nothing)',
			),
	)
		.option(
			'--post-status',
			"Post the dashboard as a status update on the scope's project or portfolio (cannot be edited; each post is new)",
		)
		.option('--dry-run', 'With --post-status: print what would be posted and post nothing')
		.action(async (opts: SprintFlags & { page?: string; postStatus?: boolean; dryRun?: boolean }) => {
			if (opts.postStatus && opts.page !== undefined) {
				throw new CodedConfigError('post-status-and-page', '--post-status and --page are two forms; pick one', {
					hint: 'Run them as two commands.',
				})
			}
			if (opts.dryRun && !opts.postStatus) {
				throw new CodedConfigError('dry-run-needs-post-status', '--dry-run only applies to --post-status', {
					hint: 'Run `cyber-asana report dashboard --post-status --dry-run`, or drop --dry-run.',
				})
			}
			if (opts.postStatus) {
				const post = await resolveApi(api).postDashboardStatus(sprintInput(opts), storeOptions(opts), {
					dryRun: opts.dryRun === true,
				})
				const gid = (post as { status_update?: { gid: string } }).status_update?.gid
				output(post, () => {
					if (post.posted) {
						console.log(`Posted a status update on ${post.parent.type} ${post.parent.gid}`)
					} else {
						console.log(
							`Dry run: nothing was posted. This is what --post-status would send to ${post.parent.type} ${post.parent.gid}`,
						)
					}
					printFields({
						Status: `${post.status_type} (${post.status_basis})`,
						Title: post.title,
						...(gid && { ID: gid }),
					})
					console.log(`\n${post.html_text}`)
					for (const note of post.notes) console.log(`\nNote: ${note}`)
					printNextSteps(
						gid
							? [
									`cyber-asana status get ${gid} — read the posted update`,
									`cyber-asana status delete ${gid} — remove it (an update cannot be edited)`,
								]
							: ['cyber-asana report dashboard --post-status — post it'],
					)
				})
				return
			}
			const r = await resolveApi(api).reportDashboard(sprintInput(opts), storeOptions(opts))
			if (opts.page !== undefined) {
				const { html, sections } = renderDashboardPage(r)
				const written = await writeDashboardPage(opts.page, html)
				output({ ...written, sections }, () => {
					console.log(
						`Wrote ${written.path} (${written.bytes} bytes, ${sections.length} sections: ${sections.join(', ')})`,
					)
					printNextSteps([
						`Open ${written.path} in a browser; nothing was published`,
						'cyber-asana report dashboard — the same reports as text',
					])
				})
				return
			}
			output(r, () => {
				console.log(`Dashboard for ${r.scope}`)
				printFields({
					Status: r.status_type ? `${r.status_type} (${r.status_basis})` : `none (${r.status_basis})`,
					Reports: r.settings.reports.join(', '),
				})
				for (const entry of r.reports) printEntry(entry)
				printCountSummary(r.reports.length, 'report(s)')
				console.log(`${r.counts.ok} ok, ${r.counts.failed} failed, ${r.counts.unsupported} unsupported`)
				printNextSteps([
					'cyber-asana report health — the findings in full, each with its fix',
					'cyber-asana report <key> — any one report in full',
				])
			})
		})
}
