import { Command, Option } from 'commander'
import { output, printEmpty, printFields, printNextSteps, printSummary } from '../../platform/cli/output.js'
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
import type { StandupGroup, StandupItem } from './standup.js'

type ReportFlags = SprintFlags & { me?: boolean; member?: string; team?: boolean }

type Standup = Awaited<ReturnType<ScrumApi['reportStandup']>>

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

function printGroup(title: string, entity: string, group: StandupGroup, tracked: Standup['points_tracked']) {
	console.log(`\n${title} (${group.count})${pointsLine(group, tracked)}`)
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

/** `report standup` and `report health`; later units add the other reports under `report`. */
export function reportCommand(api?: ResolveApi) {
	const cmd = new Command('report').description('Scrum reports computed from Asana: the CLI counts, the skill narrates')
	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana report standup',
			'  cyber-asana report standup --member someone@example.com --scope web',
			'  cyber-asana report standup --json',
			'  cyber-asana report health --scope web',
		].join('\n'),
	)

	addSprintOptions(
		cmd
			.command('standup')
			.description("A member's standup: done in the window, today in the current sprint, and blocked tasks"),
	)
		.addOption(new Option('--me', 'The signed-in user (default)').conflicts(['member', 'team']))
		.addOption(new Option('--member <user>', "Another member's GID or email").conflicts(['team']))
		.option('--team', 'The whole team (not built yet; exits 2 with error.code team-unsupported)')
		.action(async (opts: ReportFlags) => {
			const result = await resolveApi(api).reportStandup(
				{
					...sprintInput(opts),
					...(opts.member !== undefined && { member: opts.member }),
					...(opts.team && { team: true }),
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
	return cmd
}
