import { describe, expect, it } from 'vitest'
import { DEFAULT_SCRUM_POLICY, type ScrumPolicy } from '../policy.js'
import { buildStandup, type StandupTask, standupWindowStart } from './standup.js'

const days = DEFAULT_SCRUM_POLICY.working_days

describe('standupWindowStart', () => {
	it('starts at midnight of the previous working day in the given timezone', () => {
		// 2026-01-21 is a Wednesday.
		const w = standupWindowStart('previous_working_day', '2026-01-21', days, 'UTC')
		expect(w).toEqual({ from: '2026-01-20', since: '2026-01-20T00:00:00.000Z' })
	})

	it('skips the weekend on a Monday', () => {
		expect(standupWindowStart('previous_working_day', '2026-01-19', days, 'UTC').from).toBe('2026-01-16')
	})

	it('reads <n>d as n days back from today', () => {
		expect(standupWindowStart('3d', '2026-01-21', days, 'UTC').from).toBe('2026-01-18')
	})

	it('puts midnight in the named timezone, not UTC', () => {
		const w = standupWindowStart('previous_working_day', '2026-01-21', days, 'Asia/Tokyo')
		expect(w.since).toBe('2026-01-19T15:00:00.000Z')
	})
})

const me = { gid: 'u1', name: 'Me' }
const mine = { gid: 'u1', name: 'Me' }
const other = { gid: 'u2', name: 'Other' }

function task(over: Partial<StandupTask> & { gid: string }): StandupTask {
	return { name: `task ${over.gid}`, completed: false, assignee: mine, ...over }
}

const base = {
	member: me,
	today: '2026-01-21',
	since: '2026-01-20T00:00:00.000Z',
	policy: DEFAULT_SCRUM_POLICY as ScrumPolicy,
	fields: { story: new Set<string>(), task: new Set<string>(), status: new Set<string>() },
	dependenciesOf: async () => [] as Array<{ gid: string; name?: string; completed?: boolean }>,
}

describe('buildStandup', () => {
	it('puts a task completed inside the window under Done and leaves open tasks out of it', async () => {
		const result = await buildStandup({
			...base,
			tasks: [
				task({ gid: 'a', completed: true, completed_at: '2026-01-20T10:00:00Z' }),
				task({ gid: 'old', completed: true, completed_at: '2026-01-10T10:00:00Z' }),
				task({ gid: 'open' }),
			],
		})
		expect(result.done.tasks.map((t) => t.gid)).toEqual(['a'])
		expect(result.done.count).toBe(1)
	})

	it("leaves out other people's tasks", async () => {
		const result = await buildStandup({
			...base,
			tasks: [task({ gid: 'x', completed: true, completed_at: '2026-01-20T10:00:00Z', assignee: other })],
		})
		expect(result.done.count).toBe(0)
	})

	it('without a state carrier, Today is every incomplete assigned task, and says it fell back', async () => {
		const result = await buildStandup({
			...base,
			tasks: [task({ gid: 'a' }), task({ gid: 'b', due_on: '2026-02-01' })],
		})
		expect(result.today.tasks.map((t) => t.gid)).toEqual(['a', 'b'])
		expect(result.today_basis).toBe('incomplete-and-assigned')
		expect(result.notes.join(' ')).toContain('state_carrier')
	})

	it('limits Today to the sprint tasks when a sprint exists', async () => {
		const result = await buildStandup({
			...base,
			sprintGids: new Set(['a']),
			tasks: [task({ gid: 'a' }), task({ gid: 'b' })],
		})
		expect(result.today.tasks.map((t) => t.gid)).toEqual(['a'])
	})

	it('with a status field, Today is in progress or due today (or overdue)', async () => {
		const result = await buildStandup({
			...base,
			policy: { ...DEFAULT_SCRUM_POLICY, state_carrier: 'field' },
			fields: { story: new Set(), task: new Set(), status: new Set(['f-status']) },
			tasks: [
				task({ gid: 'doing', custom_fields: [{ gid: 'f-status', enum_value: { name: 'In Progress' } }] }),
				task({ gid: 'due', due_on: '2026-01-21' }),
				task({ gid: 'late', due_on: '2026-01-15' }),
				task({ gid: 'later', due_on: '2026-02-01' }),
			],
		})
		expect(result.today_basis).toBe('in-progress-or-due')
		expect(result.today.tasks.map((t) => [t.gid, t.reason])).toEqual([
			['doing', 'in progress'],
			['due', 'due today'],
			['late', 'overdue'],
		])
	})

	it('falls back, and says why, when state_carrier is field but no status field is registered', async () => {
		const result = await buildStandup({
			...base,
			policy: { ...DEFAULT_SCRUM_POLICY, state_carrier: 'field' },
			tasks: [task({ gid: 'a' })],
		})
		expect(result.today_basis).toBe('incomplete-and-assigned')
		expect(result.notes.join(' ')).toContain('status field')
	})

	it('lists a task with an incomplete dependency as blocked, with its blocker', async () => {
		const result = await buildStandup({
			...base,
			tasks: [task({ gid: 'a' })],
			dependenciesOf: async () => [
				{ gid: 'd1', name: 'upstream', completed: false },
				{ gid: 'd2', name: 'finished', completed: true },
			],
		})
		expect(result.blocked.tasks).toEqual([
			expect.objectContaining({
				gid: 'a',
				blockers: [{ signal: 'dependency', task: { gid: 'd1', name: 'upstream' } }],
			}),
		])
	})

	it('reads tag and state signals', async () => {
		const result = await buildStandup({
			...base,
			policy: { ...DEFAULT_SCRUM_POLICY, state_carrier: 'field', blocked_signals: ['tag:Blocked', 'state:review'] },
			fields: { story: new Set(), task: new Set(), status: new Set(['f-status']) },
			tasks: [
				task({ gid: 'tagged', tags: [{ name: 'blocked' }] }),
				task({ gid: 'review', custom_fields: [{ gid: 'f-status', enum_value: { name: 'Review' } }] }),
				task({ gid: 'free' }),
			],
		})
		expect(result.blocked.tasks.map((t) => [t.gid, t.blockers?.[0]?.signal])).toEqual([
			['tagged', 'tag:Blocked'],
			['review', 'state:review'],
		])
	})

	it('does not ask for dependencies when the policy does not list that signal', async () => {
		let asked = 0
		await buildStandup({
			...base,
			policy: { ...DEFAULT_SCRUM_POLICY, blocked_signals: ['tag:blocked'] },
			tasks: [task({ gid: 'a' })],
			dependenciesOf: async () => {
				asked++
				return []
			},
		})
		expect(asked).toBe(0)
	})

	it('totals story points and task points apart', async () => {
		const result = await buildStandup({
			...base,
			fields: { story: new Set(['f-story']), task: new Set(['f-task']), status: new Set() },
			tasks: [
				task({
					gid: 'a',
					completed: true,
					completed_at: '2026-01-20T10:00:00Z',
					custom_fields: [{ gid: 'f-story', number_value: 5 }],
				}),
				task({ gid: 'b', custom_fields: [{ gid: 'f-task', number_value: 2 }] }),
				task({ gid: 'c', custom_fields: [{ gid: 'f-task', number_value: 3 }] }),
			],
		})
		expect(result.done.points).toEqual({ story: 5, task: 0 })
		expect(result.today.points).toEqual({ story: 0, task: 5 })
	})

	it('says points are not tracked when neither field is registered', async () => {
		const result = await buildStandup({ ...base, tasks: [] })
		expect(result.points_tracked).toEqual({ story: false, task: false })
	})
})
