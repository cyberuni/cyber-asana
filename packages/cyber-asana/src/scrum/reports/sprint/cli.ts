import type { Command } from 'commander'
import { output, printEmpty, printNextSteps, printTable } from '../../../platform/cli/output.js'
import {
	addSprintOptions,
	dates,
	type ResolveApi,
	resolveApi,
	type SprintFlags,
	sprintInput,
	storeOptions,
} from '../../cli.js'

type Tracked = { story: boolean; task: boolean }
type Points = { story: number; task: number }

function points(p: Points, tracked: Tracked): string {
	const parts = [
		...(tracked.story ? [`${p.story} story points`] : []),
		...(tracked.task ? [`${p.task} task points`] : []),
	]
	return parts.length ? ` — ${parts.join(', ')}` : ''
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function listItems(title: string, entity: string, items: Array<{ gid: string; name: string }>) {
	console.log(`\n${title} (${items.length})`)
	if (items.length === 0) printEmpty(entity)
	for (const t of items) console.log(`  ${t.gid}  ${t.name}`)
}

const rate = (value: number | null) => (value === null ? 'n/a' : `${value}%`)

/** `report sprint | retro | velocity`: the review, retro, and velocity reports (R2, R3, R4). */
export function addSprintReportCommands(cmd: Command, api?: ResolveApi) {
	addSprintOptions(
		cmd
			.command('sprint')
			.description(
				'The sprint review: committed vs completed vs added vs removed, completion rate, burndown, demo list',
			),
	).action(async (opts: SprintFlags) => {
		const r = await resolveApi(api).reportSprint(sprintInput(opts), storeOptions(opts))
		const t = r.points_tracked
		output(r, () => {
			console.log(`Sprint report: ${r.sprint.name} (${dates(r.sprint)}) — scope ${r.scope}`)
			console.log(
				r.committed.source === 'unavailable'
					? 'Committed: unavailable (no commitment snapshot)'
					: `Committed: ${plural(r.committed.count, 'task')}${points(r.committed.points, t)} (${r.committed.source})`,
			)
			console.log(`Completed: ${plural(r.completed.count, 'task')}${points(r.completed.points, t)}`)
			console.log(`Added: ${plural(r.added.count, 'task')}${points(r.added.points, t)}`)
			console.log(
				r.removed === null
					? 'Removed: unavailable'
					: `Removed: ${plural(r.removed.count, 'task')}${points(r.removed.points, t)}`,
			)
			console.log(
				`\nCompletion rate: ${rate(r.completion_rate.count)} by count${t.story ? `; ${rate(r.completion_rate.story)} story points` : ''}${t.task ? `; ${rate(r.completion_rate.task)} task points` : ''}`,
			)
			listItems('Carry-over candidates', 'carry-over candidates', r.carry_over_candidates)
			console.log('\nBurndown (remaining at the end of each day)')
			printTable(
				r.burndown,
				[
					{ label: 'Date', get: (d) => d.date },
					{ label: 'Done that day', get: (d) => String(d.completed) },
					{ label: 'Tasks left', get: (d) => String(d.remaining.count) },
					...(t.story
						? [{ label: 'Story pts left', get: (d: (typeof r.burndown)[number]) => String(d.remaining.story) }]
						: []),
					...(t.task
						? [{ label: 'Task pts left', get: (d: (typeof r.burndown)[number]) => String(d.remaining.task) }]
						: []),
				],
				{ entity: 'burndown days' },
			)
			listItems(
				`Demo (${r.demo.basis === 'story-points' ? 'completed stories' : 'completed tasks'})`,
				'demo items',
				r.demo.tasks,
			)
			for (const note of r.notes) console.log(`\nNote: ${note}`)
			printNextSteps([
				'cyber-asana report retro — the retro data for this sprint',
				'cyber-asana sprint close — carry the open tasks over',
			])
		})
	})

	addSprintOptions(
		cmd
			.command('retro')
			.description('The retro data: carry-over, scope change, blocked time, cycle time, estimate vs actual'),
	).action(async (opts: SprintFlags) => {
		const r = await resolveApi(api).reportRetro(sprintInput(opts), storeOptions(opts))
		const t = r.points_tracked
		output(r, () => {
			console.log(`Retro: ${r.sprint.name} (${dates(r.sprint)}) — scope ${r.scope}`)
			listItems('Carry-over', 'carry-over tasks', r.carry_over)
			console.log('\nScope change')
			console.log(`  Added: ${plural(r.scope_change.added.count, 'task')}${points(r.scope_change.added.points, t)}`)
			console.log(
				r.scope_change.removed === null
					? '  Removed: unavailable'
					: `  Removed: ${plural(r.scope_change.removed.count, 'task')}${points(r.scope_change.removed.points, t)}`,
			)
			console.log(`\nBlocked (${r.blocked.tasks.length}; ${r.blocked.total_hours}h in total, from task history)`)
			if (r.blocked.tasks.length === 0) printEmpty('blocked tasks')
			for (const b of r.blocked.tasks)
				console.log(`  ${b.gid}  ${b.name} — ${b.hours}h${b.open ? ' (still blocked)' : ''}`)
			console.log(
				r.cycle_time.count === 0
					? '\nCycle time: no completed tasks'
					: `\nCycle time (${r.cycle_time.basis}, ${plural(r.cycle_time.count, 'task')}): mean ${r.cycle_time.mean_days} days, median ${r.cycle_time.median_days} days`,
			)
			if (r.estimate_vs_actual === null) {
				console.log('Estimate against actual: unavailable')
			} else {
				const { estimate, actual } = r.estimate_vs_actual.totals
				const parts = [
					...(t.story ? [`estimate ${estimate.story} story points, actual ${actual.story}`] : []),
					...(t.task ? [`estimate ${estimate.task} task points, actual ${actual.task}`] : []),
				]
				console.log(
					`Estimate against actual (${plural(r.estimate_vs_actual.tasks.length, 'task')}): ${parts.join('; ') || 'no points tracked'}`,
				)
			}
			for (const note of r.notes) console.log(`\nNote: ${note}`)
			printNextSteps([
				'cyber-asana sprint close — carry the open tasks over as the policy says',
				'cyber-asana report velocity — the trend across sprints',
			])
		})
	})

	addSprintOptions(
		cmd.command('velocity').description('Points completed per closed sprint over velocity_window, and the mean'),
		{ sprint: false },
	).action(async (opts: SprintFlags) => {
		const r = await resolveApi(api).reportVelocity(sprintInput(opts), storeOptions(opts))
		const t = r.points_tracked
		output(r, () => {
			console.log(`Velocity — scope ${r.scope}, last ${r.window} closed sprints`)
			printTable(
				r.sprints,
				[
					{ label: '#', get: (s) => String(s.n) },
					{ label: 'Sprint', get: (s) => s.name },
					{ label: 'Tasks', get: (s) => String(s.completed.count) },
					...(t.story
						? [{ label: 'Story pts', get: (s: (typeof r.sprints)[number]) => String(s.completed.points.story) }]
						: []),
					...(t.task
						? [{ label: 'Task pts', get: (s: (typeof r.sprints)[number]) => String(s.completed.points.task) }]
						: []),
				],
				{ entity: 'closed sprints' },
			)
			if (r.mean) {
				console.log(`mean per sprint: ${r.mean.count} tasks${points({ story: r.mean.story, task: r.mean.task }, t)}`)
			}
			for (const note of r.notes) console.log(`\nNote: ${note}`)
			printNextSteps(['cyber-asana report sprint --sprint previous — look inside one sprint'])
		})
	})
}
