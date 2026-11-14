import { Command, Option } from 'commander'
import {
	output,
	printCountSummary,
	printEmpty,
	printFields,
	printNextSteps,
	printSummary,
} from '../../platform/cli/output.js'
import type { ScrumApi } from '../api.js'
import {
	addSprintOptions,
	dates,
	type ResolveApi,
	resolveApi,
	type SprintFlags,
	sprintInput,
	storeOptions,
} from '../cli.js'
import { addDashboardCommand } from './dashboard/cli.js'
import { addSprintReportCommands } from './sprint/cli.js'
import type { StandupGroup, StandupItem } from './standup.js'

type ReportFlags = SprintFlags & { me?: boolean; member?: string; team?: boolean }

type Standup = Awaited<ReturnType<ScrumApi['reportStandup']>>
type TeamStandup = Awaited<ReturnType<ScrumApi['reportTeamStandup']>>

function pointsLine(group: StandupGroup, tracked: Standup['points_tracked']): string {
	const parts = [
		...(tracked.story ? [`${group.points.story} story points`] : []),
		...(tracked.task ? [`${group.points.task} task points`] : []),
	]
	return parts.length ? ` — ${parts.join(', ')}` : ''
}

function describe(item: StandupItem): string {
	const extra = [
		item.reason,
		item.due_on ? `due ${item.due_on}` : undefined,
		item.story_points ? `${item.story_points} story points` : undefined,
		item.task_points ? `${item.task_points} task points` : undefined,
	].filter(Boolean)
	const blockers = (item.blockers ?? []).map((b) =>
		b.task ? `blocked by ${b.task.gid} ${b.task.name ?? ''}`.trim() : `blocked (${b.signal})`,
	)
	return `  ${item.gid}  ${item.name}${[...extra, ...blockers].length ? ` — ${[...extra, ...blockers].join('; ')}` : ''}`
}

function printGroup(
	title: string,
	entity: string,
	group: StandupGroup,
	tracked: Standup['points_tracked'],
	indent = '',
) {
	console.log(`\n${indent}${title} (${group.count})${pointsLine(group, tracked)}`)
	if (group.count === 0) printEmpty(entity)
	for (const item of group.tasks) console.log(describe(item))
}

type Health = Awaited<ReturnType<ScrumApi['reportHealth']>>

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

function printHealth(result: Health) {
	console.log(`Health of ${result.sprint.name} (${dates(result.sprint)}) — ${result.today_date} (${result.timezone})`)
	printFields({
		Scope: result.scope,
		Sprint: result.sprint_started ? result.sprint.name : `${result.sprint.name} (no section yet)`,
	})
	console.log('\nChecks')
	for (const check of result.checks) {
		const detail = check.status === 'skipped' ? ` — ${check.reason}` : check.findings ? ` (${check.findings})` : ''
		console.log(`  ${check.id.padEnd(3)}  ${check.status.padEnd(7)}  ${check.name}${detail}`)
	}
	console.log('\nFindings')
	if (result.findings.length === 0) printEmpty('findings')
	for (const f of result.findings) {
		console.log(`  [${f.level}] ${f.check}  ${f.message}`)
		console.log(`    fix: ${f.fix}`)
	}
	printSummary(`\n${plural(result.counts.error, 'error')}, ${plural(result.counts.warning, 'warning')}`)
	for (const note of result.notes) console.log(`\nNote: ${note}`)
}

type Workload = Awaited<ReturnType<ScrumApi['reportWorkload']>>

const hoursText = (h: { story: number; task: number; total: number }, tracked: Workload['points_tracked']) => {
	const parts = [...(tracked.story ? [`${h.story} h story`] : []), ...(tracked.task ? [`${h.task} h task`] : [])]
	return `${h.total} h${parts.length ? ` (${parts.join(', ')})` : ''}`
}

const pointsText = (story: number, task: number, tracked: Workload['points_tracked']) =>
	[...(tracked.story ? [`${story} story`] : []), ...(tracked.task ? [`${task} task`] : [])].join(', ') ||
	'no points fields'

function capacityText(p: Workload['people'][number]) {
	if (p.capacity.status === 'known') {
		return `capacity ${p.capacity.hours} h, ${p.utilization_pct === null ? 'no utilization' : `${p.utilization_pct}%`}, ${p.flag}`
	}
	return `capacity unknown: ${p.capacity.reason === 'plan' ? 'the plan does not include allocations (402)' : 'no allocation in the window'}`
}

function printWorkload(result: Workload) {
	const title = result.sprint
		? `${result.sprint.name} (${dates({ start: result.window.from, end: result.window.to })})`
		: dates({ start: result.window.from, end: result.window.to })
	console.log(`Workload for ${title} — ${result.today_date} (${result.timezone})`)
	printFields({
		Scope: result.scope,
		Effort: `${result.hours_per_point} h per point; ${result.working_hours_per_day} working h per day`,
		Flags: `over above ${result.settings.over_allocation_pct}%, under below ${result.settings.under_allocation_pct}%`,
	})
	console.log('\nPeople')
	if (result.people.length === 0) printEmpty('people')
	for (const p of result.people) {
		console.log(
			`  ${p.person.name ?? p.person.gid}: ${p.tasks} task(s), ${pointsText(p.story_points, p.task_points, result.points_tracked)} points, ${hoursText(p.effort_hours, result.points_tracked)}; ${capacityText(p)}`,
		)
		for (const o of p.ooo ?? [])
			console.log(`    out of office ${o.start_date} to ${o.end_date} (a note; capacity is not reduced)`)
	}
	const t = result.team
	printSummary(
		`\nTeam: ${t.people} people, ${hoursText(t.effort_hours, result.points_tracked)} of load; capacity ${t.capacity_hours === null ? 'unknown' : `${t.capacity_hours} h`}${t.utilization_pct === null ? '' : `, ${t.utilization_pct}% used`}${t.capacity_unknown ? ` (${t.capacity_unknown} without known capacity)` : ''}`,
	)
	if (result.unassigned_tasks > 0)
		console.log(`${result.unassigned_tasks} unassigned task(s) are not counted for anyone`)
	for (const note of result.notes) console.log(`\nNote: ${note}`)
}

function printTeamStandup(result: TeamStandup) {
	console.log(`Team standup for ${result.scope} — ${result.today_date} (${result.timezone})`)
	printFields({
		Sprint: result.sprint ? `${result.sprint.name} (${dates(result.sprint)})` : 'none',
		Window: `done since ${result.window.since} (${result.window.setting})`,
	})
	if (result.sprint_note) console.log(`\nNo current sprint: ${result.sprint_note}`)
	if (result.members.length === 0) printEmpty('members')
	for (const { member, done, today, blocked } of result.members) {
		console.log(`\n${member.name ?? member.gid} (${member.gid})`)
		printGroup('Done', 'done tasks', done, result.points_tracked)
		printGroup('Today', 'tasks for today', today, result.points_tracked)
		printGroup('Blocked', 'blocked tasks', blocked, result.points_tracked)
	}
	printCountSummary(result.count.members, 'member(s)')
	for (const note of result.notes) console.log(`\nNote: ${note}`)
	printNextSteps([
		'cyber-asana report standup --member <user> — one person in full',
		'cyber-asana sprint tasks — see the whole sprint',
	])
}

/** `report standup`, `report health`, and `report workload`; later units add the other reports under `report`. */
export function reportCommand(api?: ResolveApi) {
	const cmd = new Command('report').description('Scrum reports computed from Asana: the CLI counts, the skill narrates')
	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana report standup',
			'  cyber-asana report standup --member someone@example.com --scope web',
			'  cyber-asana report standup --team --scope web-team',
			'  cyber-asana report standup --json',
			'  cyber-asana report health --scope web',
			'  cyber-asana report workload',
			'  cyber-asana report workload --from 2026-01-19 --to 2026-01-30 --scope web',
			'  cyber-asana report dashboard --scope web --json',
		].join('\n'),
	)

	addSprintOptions(
		cmd
			.command('standup')
			.description("A member's standup: done in the window, today in the current sprint, and blocked tasks"),
	)
		.addOption(new Option('--me', 'The signed-in user (default)').conflicts(['member', 'team']))
		.addOption(new Option('--member <user>', "Another member's GID or email").conflicts(['team']))
		.option('--team', "Every person of the scope, grouped by person: a team scope's members, else the assignees seen")
		.action(async (opts: ReportFlags) => {
			if (opts.team) {
				const team = await resolveApi(api).reportTeamStandup(sprintInput(opts), storeOptions(opts))
				output(team, () => printTeamStandup(team))
				return
			}
			const result = await resolveApi(api).reportStandup(
				{
					...sprintInput(opts),
					...(opts.member !== undefined && { member: opts.member }),
				},
				storeOptions(opts),
			)
			output(result, () => {
				console.log(
					`Standup for ${result.member.name ?? result.member.gid} — ${result.today_date} (${result.timezone})`,
				)
				printFields({
					Scope: result.scope,
					Sprint: result.sprint ? `${result.sprint.name} (${dates(result.sprint)})` : 'none',
					Window: `done since ${result.window.since} (${result.window.setting})`,
				})
				if (result.sprint_note) console.log(`\nNo current sprint: ${result.sprint_note}`)
				const tracked = result.points_tracked
				printGroup('Done', 'done tasks', result.done, tracked)
				printGroup('Today', 'tasks for today', result.today, tracked)
				printGroup('Blocked', 'blocked tasks', result.blocked, tracked)
				for (const note of result.notes) console.log(`\nNote: ${note}`)
				printNextSteps([
					'cyber-asana sprint tasks — see the whole sprint',
					'cyber-asana report standup --member <user> — a teammate',
				])
			})
		})

	addSprintOptions(
		cmd
			.command('health')
			.description('Health checks H1–H11 over the sprint: estimates, owners, due dates, WIP, blockers, structure'),
	).action(async (opts: SprintFlags) => {
		const result = await resolveApi(api).reportHealth(sprintInput(opts), storeOptions(opts))
		output(result, () => {
			printHealth(result)
			printNextSteps(
				result.findings.length > 0
					? ["Run a finding's fix command, then: cyber-asana report health — check again"]
					: ['cyber-asana sprint tasks — see the whole sprint', "cyber-asana report standup — a member's day"],
			)
		})
	})

	addSprintOptions(
		cmd
			.command('workload')
			.description('Per person: load of incomplete assigned tasks against Allocations capacity, with over/under flags'),
	)
		.addOption(
			new Option('--from <date>', 'First day of the window (YYYY-MM-DD); default: the sprint').conflicts('sprint'),
		)
		.addOption(
			new Option('--to <date>', 'Last day of the window (YYYY-MM-DD); default: the sprint').conflicts('sprint'),
		)
		.option('--workspace <gid>', 'Workspace GID for out-of-office (default: ASANA_WORKSPACE_GID)')
		.action(async (opts: SprintFlags & { from?: string; to?: string; workspace?: string }) => {
			const result = await resolveApi(api).reportWorkload(
				{
					...sprintInput(opts),
					...(opts.from !== undefined && { from: opts.from }),
					...(opts.to !== undefined && { to: opts.to }),
					...(opts.workspace !== undefined && { workspace: opts.workspace }),
				},
				storeOptions(opts),
			)
			output(result, () => {
				printWorkload(result)
				printNextSteps([
					'cyber-asana report health — H8 checks the sprint against capacity',
					'cyber-asana allocation list --assignee <gid> — see what capacity is based on',
				])
			})
		})
	addSprintReportCommands(cmd, api)
	addDashboardCommand(cmd, api)
	return cmd
}
