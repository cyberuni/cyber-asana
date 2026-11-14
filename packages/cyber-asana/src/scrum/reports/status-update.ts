import type { ScopeEntry } from '../../config/scopes.js'
import { CodedConfigError } from '../../platform/coded-error.js'

/** The `## Status update` section of `cyber-asana.dashboard` (§ 5.5): a title line and an html block. */
export type StatusTemplate = { title: string; body: string }

const invalid = (why: string, hint?: string) =>
	new CodedConfigError('status-template-invalid', `cyber-asana.dashboard: ${why}`, {
		hint: hint ?? 'Patch the "## Status update" section of the cyber-asana.dashboard reference, then retry.',
	})

/** Reads the title and body out of the reference's `## Status update` section; the rest of the document is ignored. */
export function parseStatusTemplate(content: string): StatusTemplate {
	const section = /^## Status update[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(content)
	if (!section) throw invalid('it has no "## Status update" section')
	const text = section[1] as string
	const title = /^Title:\s*`([^`\n]+)`\s*$/m.exec(text)
	if (!title) throw invalid('"## Status update" has no line like Title: `{sprint} — {status}`')
	const block = /```html\n([\s\S]*?)\n```/.exec(text)
	if (!block) throw invalid('"## Status update" has no ```html block holding the body')
	return { title: title[1] as string, body: (block[1] as string).trim() }
}

type Health = { counts: { error: number; warning: number }; findings: Array<Record<string, any>> }
type Dashboard = {
	scope: string
	status_type: string
	reports: Array<{ key: string; status: string; data?: any }>
}

const LABELS: Record<string, string> = {
	on_track: 'On track',
	at_risk: 'At risk',
	off_track: 'Off track',
	on_hold: 'On hold',
	complete: 'Complete',
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

type Scalars = Record<string, string | undefined>
type Groups = Record<string, Array<Record<string, string>>>

function gather(dashboard: Dashboard): { scalars: Scalars; groups: Groups; sprint: string } {
	const ok = (key: string) => dashboard.reports.find((r) => r.key === key && r.status === 'ok')?.data
	const scalars: Scalars = {
		scope: escapeHtml(dashboard.scope),
		status: LABELS[dashboard.status_type] ?? dashboard.status_type,
		status_type: dashboard.status_type,
	}
	const groups: Groups = { finding: [], person: [] }

	const health = ok('health') as Health | undefined
	if (health) {
		scalars.errors = String(health.counts.error)
		scalars.warnings = String(health.counts.warning)
		groups.finding = health.findings.map((f) => {
			const task = f.task as { name?: string; url?: string } | undefined
			const name = task
				? task.url
					? `<a href="${escapeHtml(task.url)}">${escapeHtml(task.name ?? '')}</a>`
					: escapeHtml(task.name ?? '')
				: ''
			return { finding: `${escapeHtml(f.check)} ${name ? `${name}: ` : ''}${escapeHtml(f.message)}` }
		})
	}

	const sprint = ok('sprint')
	if (sprint) {
		scalars.sprint = escapeHtml(sprint.sprint.name)
		const none = sprint.committed.source === 'unavailable'
		const unknown = 'unknown (no commitment snapshot)'
		scalars.committed_tasks = none ? unknown : String(sprint.committed.count)
		scalars.completed_tasks = String(sprint.completed.count)
		if (sprint.completion_rate.count !== null) scalars.completion_rate = `${sprint.completion_rate.count}%`
		if (sprint.points_tracked.story) {
			scalars.story_completed = String(sprint.completed.points.story)
			scalars.story_committed = none ? unknown : String(sprint.committed.points.story)
		}
		if (sprint.points_tracked.task) {
			scalars.task_completed = String(sprint.completed.points.task)
			scalars.task_committed = none ? unknown : String(sprint.committed.points.task)
		}
	}

	const workload = ok('workload')
	if (workload) {
		groups.person = workload.people.map((p: any) => ({
			person: escapeHtml(p.person.name ?? p.person.gid),
			load: `${p.effort_hours.total} h`,
			capacity: p.capacity.status === 'known' ? `${p.capacity.hours} h` : `unknown (${escapeHtml(p.capacity.reason)})`,
			flag: p.flag,
		}))
	}

	const velocity = ok('velocity')
	if (velocity?.mean) {
		scalars.velocity_window = String(velocity.window)
		if (velocity.points_tracked?.story) scalars.velocity_story = String(velocity.mean.story)
		if (velocity.points_tracked?.task) scalars.velocity_task = String(velocity.mean.task)
	}
	return { scalars, groups, sprint: scalars.sprint ?? scalars.scope ?? '' }
}

const SCALARS = [
	'scope',
	'status',
	'status_type',
	'sprint',
	'errors',
	'warnings',
	'committed_tasks',
	'completed_tasks',
	'completion_rate',
	'story_completed',
	'story_committed',
	'task_completed',
	'task_committed',
	'velocity_window',
	'velocity_story',
	'velocity_task',
]
/** Placeholders that stand for one item of a list; a line holding one is written once per item. */
const GROUP_OF: Record<string, string> = {
	finding: 'finding',
	person: 'person',
	load: 'person',
	capacity: 'person',
	flag: 'person',
}

const PLACEHOLDER = /\{([a-z_]+)\}/g

function fill(line: string, scalars: Scalars, groups: Groups): string[] {
	const names = [...line.matchAll(PLACEHOLDER)].map((m) => m[1] as string)
	for (const name of names) {
		if (!SCALARS.includes(name) && !(name in GROUP_OF)) {
			throw invalid(
				`the placeholder {${name}} is unknown`,
				`Use one of ${[...SCALARS, ...Object.keys(GROUP_OF)].map((n) => `{${n}}`).join(', ')}.`,
			)
		}
	}
	const group = names.map((n) => GROUP_OF[n]).find((g) => g !== undefined)
	if (group) {
		return (groups[group] ?? []).map((item) =>
			line.replace(PLACEHOLDER, (_m, n: string) => item[n] ?? scalars[n] ?? ''),
		)
	}
	if (names.some((n) => scalars[n] === undefined)) return []
	return [line.replace(PLACEHOLDER, (_m, n: string) => scalars[n] as string)]
}

/**
 * Fills the template from the dashboard JSON. A line whose figure the dashboard did not compute is
 * left out, and so is a heading left with an empty list; a commitment that could not be rebuilt is
 * written as "unknown" with the reason, never as zero. Every value is HTML-escaped.
 */
export function renderStatusUpdate(
	template: StatusTemplate,
	dashboard: Dashboard,
): { title: string; html_text: string } {
	const { scalars, groups } = gather(dashboard)
	const title =
		fill(template.title, scalars, groups)[0] ??
		fill(template.title, { ...scalars, sprint: scalars.scope }, groups)[0] ??
		''
	const lines = template.body.split('\n').flatMap((line) => fill(line, scalars, groups))
	const html = lines.join('\n').replace(/<h[1-3]>[^\n]*<\/h[1-3]>\n<ul>\n<\/ul>\n?/g, '')
	return { title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'), html_text: html }
}

const unavailable = (why: string) =>
	new CodedConfigError('status-parent-unavailable', why, {
		hint: 'Set status_parent in the cyber-asana.dashboard reference to project or portfolio, or use a scope that has a single project or a portfolio.',
	})

/** The project or portfolio a dashboard status update is posted on, from the scope and `status_parent` (§ 5.5). */
export function statusParentFor(
	scope: ScopeEntry,
	preference: 'project' | 'portfolio' | 'scope-default',
): { gid: string; type: 'project' | 'portfolio' } {
	const portfolio = scope.portfolio ?? scope.sprint_portfolio
	const project = scope.backlog_project ?? (scope.projects?.length === 1 ? scope.projects[0] : undefined)
	const want = preference === 'scope-default' ? (scope.kind === 'portfolio' ? 'portfolio' : 'project') : preference
	if (want === 'portfolio') {
		if (portfolio) return { gid: portfolio, type: 'portfolio' }
		throw unavailable(`scope ${scope.name} has no portfolio to post a status update on`)
	}
	if (project) return { gid: project, type: 'project' }
	throw unavailable(`scope ${scope.name} (${scope.kind}) has no single project to post a status update on`)
}
