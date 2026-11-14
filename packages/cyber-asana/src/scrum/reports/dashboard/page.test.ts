import { describe, expect, it } from 'vitest'
import type { DashboardEntry } from '../../dashboard-api.js'
import { PAGE_MARKER, renderDashboardPage } from './page.js'

type Dashboard = Parameters<typeof renderDashboardPage>[0]

const sprint = { n: 2, name: 'Sprint 2', start: '2026-01-19', end: '2026-02-01', working_days: 10 }
const zero = { story: 0, task: 0 }
const tracked = { story: true, task: false }
const person = (gid: string, name: string) => ({ gid, name })

const entries: DashboardEntry[] = [
	{
		key: 'sprint',
		status: 'ok',
		data: {
			sprint,
			points_tracked: tracked,
			committed: { source: 'snapshot', count: 4, points: { story: 10, task: 0 } },
			completed: { count: 2, points: { story: 5, task: 0 } },
			added: { count: 1, points: zero },
			removed: { count: 0, points: zero },
			completion_rate: { count: 50, story: 50, task: null },
			burndown: [
				{ date: '2026-01-19', completed: 0, remaining: { count: 4, story: 10, task: 0 } },
				{ date: '2026-01-20', completed: 1, remaining: { count: 3, story: 7, task: 0 } },
				{ date: '2026-01-21', completed: 1, remaining: { count: 2, story: 5, task: 0 } },
			],
			notes: ['sprint note'],
		},
	} as unknown as DashboardEntry,
	{
		key: 'health',
		status: 'ok',
		data: {
			counts: { error: 1, warning: 1 },
			findings: [
				{
					check: 'H4',
					level: 'error',
					message: 'Late task is overdue',
					fix: 'cyber-asana task update t1 --due-on <date>',
				},
				{
					check: 'H3',
					level: 'warning',
					message: 'Nobody task is unassigned',
					fix: 'cyber-asana task update t2 --assignee me',
				},
			],
			notes: [],
		},
	} as unknown as DashboardEntry,
	{
		key: 'workload',
		status: 'ok',
		data: {
			people: [
				{
					person: person('1', 'Ada'),
					tasks: 3,
					effort_hours: { story: 20, task: 0, total: 20 },
					capacity: { status: 'known', hours: 40 },
					utilization_pct: 50,
					flag: 'under',
				},
				{
					person: person('2', 'Bo'),
					tasks: 5,
					effort_hours: { story: 50, task: 0, total: 50 },
					capacity: { status: 'unknown', reason: 'no-allocation' },
					utilization_pct: null,
					flag: 'unknown',
				},
			],
			team: { people: 2, effort_hours: { total: 70 }, capacity_hours: 40, utilization_pct: 50, capacity_unknown: 1 },
			notes: [],
		},
	} as unknown as DashboardEntry,
	{
		key: 'velocity',
		status: 'ok',
		data: {
			window: 3,
			sprints: [
				{ n: 0, name: 'Sprint 0', completed: { count: 4, points: { story: 8, task: 0 } } },
				{ n: 1, name: 'Sprint 1', completed: { count: 6, points: { story: 12, task: 0 } } },
			],
			mean: { count: 5, story: 10, task: 0 },
			points_tracked: tracked,
			notes: [],
		},
	} as unknown as DashboardEntry,
]

const dashboard = (reports: DashboardEntry[], extra: Partial<Dashboard> = {}): Dashboard =>
	({
		scope: 'web',
		settings: { reports: reports.map((r) => r.key), forms: ['page'] },
		reports,
		counts: { ok: reports.length, failed: 0, unsupported: 0 },
		status_type: 'off_track',
		status_basis: 'health: 1 error, 1 warning',
		notes: ['dashboard note'],
		...extra,
	}) as unknown as Dashboard

describe('renderDashboardPage', () => {
	it('renders the six sections in the reference order', () => {
		const { html, sections } = renderDashboardPage(dashboard(entries))
		expect(sections).toEqual(['header', 'burndown', 'health', 'workload', 'velocity', 'notes'])
		const at = sections.map((s) => html.indexOf(`id="${s}"`))
		expect(at.every((i) => i >= 0)).toBe(true)
		expect([...at].sort((a, b) => a - b)).toEqual(at)
	})

	it('is one self-contained document: no network, no script src, marker, viewport, both themes', () => {
		const { html } = renderDashboardPage(dashboard(entries))
		expect(html.startsWith('<!doctype html>')).toBe(true)
		expect(html).toContain(PAGE_MARKER)
		expect(html).toContain('name="viewport"')
		expect(html).toContain('prefers-color-scheme: dark')
		expect(html).not.toMatch(/https?:\/\//)
		expect(html).not.toMatch(/<script|<link|@import|src=/i)
	})

	it('shows the header: scope, sprint, status with its basis', () => {
		const { html } = renderDashboardPage(dashboard(entries))
		expect(html).toContain('web')
		expect(html).toContain('Sprint 2')
		expect(html).toContain('2026-01-19')
		expect(html).toContain('off_track')
		expect(html).toContain('health: 1 error, 1 warning')
	})

	it('draws the burndown as one SVG point per day', () => {
		const { html } = renderDashboardPage(dashboard(entries))
		const burndown = html.slice(html.indexOf('id="burndown"'), html.indexOf('id="health"'))
		expect(burndown).toContain('<svg')
		expect(burndown.match(/<circle/g)).toHaveLength(3)
	})

	it('groups findings by level with their fix commands', () => {
		const { html } = renderDashboardPage(dashboard(entries))
		const health = html.slice(html.indexOf('id="health"'), html.indexOf('id="workload"'))
		expect(health.indexOf('Errors')).toBeLessThan(health.indexOf('Warnings'))
		expect(health).toContain('Late task is overdue')
		expect(health).toContain('cyber-asana task update t2 --assignee me')
	})

	it('shows a bar per person with the flag, and says unknown capacity is unknown', () => {
		const { html } = renderDashboardPage(dashboard(entries))
		const workload = html.slice(html.indexOf('id="workload"'), html.indexOf('id="velocity"'))
		expect(workload).toContain('Ada')
		expect(workload).toContain('under')
		expect(workload).toContain('Bo')
		expect(workload).toMatch(/capacity unknown/i)
		expect(workload).not.toMatch(/capacity: 0/i)
	})

	it('shows a velocity bar per closed sprint, story points only when tracked, with the mean', () => {
		const { html } = renderDashboardPage(dashboard(entries))
		const velocity = html.slice(html.indexOf('id="velocity"'), html.indexOf('id="notes"'))
		expect(velocity).toContain('Sprint 0')
		expect(velocity).toContain('Sprint 1')
		expect(velocity).toContain('story points')
		expect(velocity).not.toContain('task points')
		expect(velocity).toContain('10')
	})

	it('names a report that is not listed, failed, or unsupported in its section instead of dropping it', () => {
		const failed: DashboardEntry = {
			key: 'workload',
			status: 'failed',
			error: { code: 'sprint-none', message: 'Sprint 2 has no section', hint: 'cyber-asana sprint start' },
		}
		const unsupported: DashboardEntry = { key: 'velocity', status: 'unsupported', reason: 'no implementation' }
		const { html, sections } = renderDashboardPage(dashboard([failed, unsupported]))
		expect(sections).toEqual(['header', 'burndown', 'health', 'workload', 'velocity', 'notes'])
		const burndown = html.slice(html.indexOf('id="burndown"'), html.indexOf('id="health"'))
		expect(burndown).toMatch(/sprint.*not in this dashboard/i)
		const health = html.slice(html.indexOf('id="health"'), html.indexOf('id="workload"'))
		expect(health).toMatch(/health.*not in this dashboard/i)
		const workload = html.slice(html.indexOf('id="workload"'), html.indexOf('id="velocity"'))
		expect(workload).toContain('sprint-none')
		expect(workload).toContain('cyber-asana sprint start')
		const velocity = html.slice(html.indexOf('id="velocity"'), html.indexOf('id="notes"'))
		expect(velocity).toContain('no implementation')
	})

	it('lists every report note and every report it could not compute in Notes', () => {
		const { html } = renderDashboardPage(
			dashboard([
				...entries,
				{ key: 'release-readiness', status: 'unsupported', reason: 'the CLI does not compute it' },
			]),
		)
		const notes = html.slice(html.indexOf('id="notes"'))
		expect(notes).toContain('dashboard note')
		expect(notes).toContain('sprint note')
		expect(notes).toContain('release-readiness')
		expect(notes).toContain('the CLI does not compute it')
	})

	it('never turns a missing figure into zero', () => {
		const { html } = renderDashboardPage(
			dashboard([
				{
					key: 'velocity',
					status: 'ok',
					data: { window: 3, sprints: [], mean: null, points_tracked: tracked, notes: [] },
				} as unknown as DashboardEntry,
			]),
		)
		expect(html).toMatch(/no closed sprint/i)
	})

	it('escapes every user string', () => {
		const evil = '<img src=x onerror=alert(1)>&"\''
		const hostile = entries.map((e) => {
			if (e.status !== 'ok') return e
			const data = e.data as unknown as Record<string, unknown>
			if (e.key === 'health') {
				const [first, ...rest] = data.findings as Array<Record<string, unknown>>
				return { ...e, data: { ...data, findings: [{ ...first, message: evil, fix: evil }, ...rest] } }
			}
			if (e.key === 'workload') {
				const [first, ...rest] = data.people as Array<Record<string, unknown>>
				return { ...e, data: { ...data, people: [{ ...first, person: { gid: '1', name: evil } }, ...rest] } }
			}
			return e
		}) as DashboardEntry[]
		const { html } = renderDashboardPage(dashboard(hostile, { scope: evil, notes: [evil], status_basis: evil }))
		expect(html).not.toContain('<img')
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;&amp;&quot;&#39;')
	})

	it('is deterministic', () => {
		expect(renderDashboardPage(dashboard(entries)).html).toBe(renderDashboardPage(dashboard(entries)).html)
	})
})
