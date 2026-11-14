import type { DashboardEntry } from '../../dashboard-api.js'

/** Written into every page so `--page` can tell its own previous output from someone else's file. */
export const PAGE_MARKER = '<meta name="generator" content="cyber-asana report dashboard --page">'

type Dashboard = {
	scope: string
	settings: { reports: string[] }
	reports: DashboardEntry[]
	status_type: string | null
	status_basis: string
	notes: string[]
}

type Ok<K extends DashboardEntry['key']> = Extract<DashboardEntry, { key: K; status: 'ok' }>['data']

const PAGE_SECTIONS = ['header', 'burndown', 'health', 'workload', 'velocity', 'notes'] as const
export type PageSection = (typeof PAGE_SECTIONS)[number]

/** Every user string goes through here: task names, person names, messages, and commands are user content. */
const esc = (value: unknown): string =>
	String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')

const num = (n: number) => String(Math.round(n * 10) / 10)

const CSS = `
:root{--bg:#fff;--fg:#1b1f24;--muted:#5b6570;--card:#f5f7fa;--line:#d5dbe3;--accent:#2f6fdb;--accent2:#8a5bd6;--error:#c62828;--warning:#b26a00;--ok:#2e7d32}
@media (prefers-color-scheme: dark){:root{--bg:#14171b;--fg:#e6e9ed;--muted:#99a3ae;--card:#1e2329;--line:#343b44;--accent:#6ea2ff;--accent2:#b794f4;--error:#ff8a80;--warning:#ffb74d;--ok:#81c784}}
*{box-sizing:border-box}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,sans-serif}
main{max-width:56rem;margin:0 auto}
section{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin:0 0 16px;overflow-wrap:anywhere}
h1{font-size:1.4rem;margin:0 0 8px}h2{font-size:1.1rem;margin:0 0 8px}h3{font-size:1rem;margin:12px 0 4px}
.muted{color:var(--muted)}.error{color:var(--error)}.warning{color:var(--warning)}.on_track{color:var(--ok)}
.status{font-weight:700}
code{font:0.85rem ui-monospace,monospace;overflow-wrap:anywhere}
ul{padding-left:1.2rem;margin:4px 0}
svg{width:100%;height:auto;display:block}
.axis{stroke:var(--line)}.line{fill:none;stroke:var(--accent);stroke-width:2}.dot{fill:var(--accent)}.tick{fill:var(--muted);font-size:10px}
.row{margin:8px 0}.label{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap}
.track{background:var(--bg);border:1px solid var(--line);border-radius:4px;height:12px;margin:2px 0}
.bar{height:100%;border-radius:3px;background:var(--accent)}.bar.b2{background:var(--accent2)}
`

function missing(key: string, entry: DashboardEntry | undefined, listed: boolean): string {
	if (!listed || !entry) return `<p class="muted">The ${esc(key)} report is not in this dashboard's reports.</p>`
	if (entry.status === 'failed') {
		return `<p class="error">The ${esc(key)} report failed (<code>${esc(entry.error.code)}</code>): ${esc(entry.error.message)}</p>${
			entry.error.hint ? `<p class="muted">${esc(entry.error.hint)}</p>` : ''
		}`
	}
	if (entry.status === 'unsupported')
		return `<p class="muted">The ${esc(key)} report is unsupported: ${esc(entry.reason)}</p>`
	return ''
}

function find<K extends DashboardEntry['key']>(d: Dashboard, key: K) {
	const entry = d.reports.find((r) => r.key === key)
	const ok = entry?.status === 'ok' ? (entry.data as Ok<K>) : undefined
	return { entry, ok, listed: d.settings.reports.includes(key) || entry !== undefined }
}

const block = (id: PageSection, title: string, body: string) =>
	`<section id="${id}"><h2>${esc(title)}</h2>${body}</section>`

function header(d: Dashboard): string {
	const sprint = find(d, 'sprint').ok?.sprint
	const status = d.status_type
		? `<span class="status ${esc(d.status_type)}">${esc(d.status_type)}</span> <span class="muted">(${esc(d.status_basis)})</span>`
		: `<span class="status muted">no status</span> <span class="muted">(${esc(d.status_basis)})</span>`
	return `<section id="header"><h1>Sprint dashboard: ${esc(d.scope)}</h1>${
		sprint
			? `<p>${esc(sprint.name)} <span class="muted">(${esc(sprint.start)} to ${esc(sprint.end)})</span></p>`
			: '<p class="muted">No sprint report, so the sprint name and dates are unknown.</p>'
	}<p>Status: ${status}</p></section>`
}

function burndown(d: Dashboard): string {
	const { ok, entry, listed } = find(d, 'sprint')
	if (!ok) return block('burndown', 'Burndown', missing('sprint', entry, listed))
	const days = ok.burndown
	if (days.length === 0)
		return block('burndown', 'Burndown', '<p class="muted">The sprint has not started: no days to chart.</p>')
	const W = 600
	const H = 200
	const pad = { l: 32, r: 12, t: 12, b: 24 }
	const max = Math.max(1, ...days.map((p) => p.remaining.count))
	const x = (i: number) =>
		pad.l + (days.length === 1 ? (W - pad.l - pad.r) / 2 : (i * (W - pad.l - pad.r)) / (days.length - 1))
	const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b)
	const points = days.map((p, i) => `${num(x(i))},${num(y(p.remaining.count))}`).join(' ')
	const dots = days
		.map(
			(p, i) =>
				`<circle class="dot" cx="${num(x(i))}" cy="${num(y(p.remaining.count))}" r="3"><title>${esc(p.date)}: ${p.remaining.count} tasks remaining</title></circle>`,
		)
		.join('')
	const svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Tasks remaining per day"><line class="axis" x1="${pad.l}" y1="${H - pad.b}" x2="${W - pad.r}" y2="${H - pad.b}"/><line class="axis" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${H - pad.b}"/><text class="tick" x="${pad.l - 4}" y="${pad.t + 4}" text-anchor="end">${max}</text><text class="tick" x="${pad.l - 4}" y="${H - pad.b}" text-anchor="end">0</text><text class="tick" x="${pad.l}" y="${H - 6}">${esc(days[0]?.date)}</text><text class="tick" x="${W - pad.r}" y="${H - 6}" text-anchor="end">${esc(days[days.length - 1]?.date)}</text><polyline class="line" points="${points}"/>${dots}</svg>`
	const last = days[days.length - 1]
	return block(
		'burndown',
		'Burndown',
		`<p class="muted">Tasks remaining per day; ${last?.remaining.count} left on ${esc(last?.date)}.</p>${svg}`,
	)
}

function health(d: Dashboard): string {
	const { ok, entry, listed } = find(d, 'health')
	if (!ok) return block('health', 'Health', missing('health', entry, listed))
	if (ok.findings.length === 0) return block('health', 'Health', '<p>0 findings.</p>')
	const group = (level: 'error' | 'warning', title: string) => {
		const items = ok.findings.filter((f) => f.level === level)
		if (items.length === 0) return ''
		return `<h3 class="${level}">${title} (${items.length})</h3><ul>${items
			.map((f) => `<li><strong>${esc(f.check)}</strong> ${esc(f.message)}<br><code>${esc(f.fix)}</code></li>`)
			.join('')}</ul>`
	}
	return block('health', 'Health', group('error', 'Errors') + group('warning', 'Warnings'))
}

function workload(d: Dashboard): string {
	const { ok, entry, listed } = find(d, 'workload')
	if (!ok) return block('workload', 'Workload', missing('workload', entry, listed))
	if (ok.people.length === 0) return block('workload', 'Workload', '<p>0 people found.</p>')
	const scale = Math.max(
		1,
		...ok.people.map((p) => Math.max(p.effort_hours.total, p.capacity.status === 'known' ? p.capacity.hours : 0)),
	)
	const rows = ok.people
		.map((p) => {
			const cap =
				p.capacity.status === 'known'
					? `${num(p.capacity.hours)} h capacity`
					: `capacity unknown (${esc(p.capacity.reason)})`
			const util = p.utilization_pct === null ? '' : `, ${p.utilization_pct}% used`
			const capBar =
				p.capacity.status === 'known'
					? `<div class="track" title="capacity"><div class="bar b2" style="width:${num((p.capacity.hours / scale) * 100)}%"></div></div>`
					: ''
			return `<div class="row"><div class="label"><span>${esc(p.person.name ?? p.person.gid)}</span><span class="${p.flag === 'over' ? 'error' : p.flag === 'under' ? 'warning' : 'muted'}">${esc(p.flag)}</span></div><div class="track" title="load"><div class="bar" style="width:${num((p.effort_hours.total / scale) * 100)}%"></div></div>${capBar}<div class="muted">${num(p.effort_hours.total)} h load, ${cap}${util}</div></div>`
		})
		.join('')
	const t = ok.team
	return block(
		'workload',
		'Workload',
		`<p class="muted">Load against capacity per person. Blue is load, purple is capacity.</p>${rows}<p>Team: ${num(t.effort_hours.total)} h load; capacity ${t.capacity_hours === null ? 'unknown' : `${num(t.capacity_hours)} h`}${t.utilization_pct === null ? '' : `, ${t.utilization_pct}% used`}</p>`,
	)
}

function velocity(d: Dashboard): string {
	const { ok, entry, listed } = find(d, 'velocity')
	if (!ok) return block('velocity', 'Velocity', missing('velocity', entry, listed))
	if (ok.sprints.length === 0)
		return block('velocity', 'Velocity', '<p class="muted">No closed sprint yet, so there is no velocity.</p>')
	const t = ok.points_tracked
	const kinds = [
		...(t.story ? [{ key: 'story' as const, label: 'story points', cls: '' }] : []),
		...(t.task ? [{ key: 'task' as const, label: 'task points', cls: ' b2' }] : []),
	]
	const scale = Math.max(
		1,
		...ok.sprints.flatMap((s) => (kinds.length ? kinds.map((k) => s.completed.points[k.key]) : [s.completed.count])),
	)
	const rows = ok.sprints
		.map((s) => {
			const bars = kinds.length
				? kinds
						.map(
							(k) =>
								`<div class="track" title="${k.label}"><div class="bar${k.cls}" style="width:${num((s.completed.points[k.key] / scale) * 100)}%"></div></div><div class="muted">${num(s.completed.points[k.key])} ${k.label}</div>`,
						)
						.join('')
				: `<div class="track"><div class="bar" style="width:${num((s.completed.count / scale) * 100)}%"></div></div>`
			return `<div class="row"><div class="label"><span>${esc(s.name)}</span><span class="muted">${s.completed.count} tasks</span></div>${bars}</div>`
		})
		.join('')
	const m = ok.mean
	const mean = m
		? `<p>Mean of the last ${ok.sprints.length} sprints: ${m.count} tasks${kinds.map((k) => `, ${num(m[k.key])} ${k.label}`).join('')}</p>`
		: ''
	return block('velocity', 'Velocity', `${rows}${mean}`)
}

function notes(d: Dashboard): string {
	const lines: string[] = [...d.notes]
	for (const r of d.reports) {
		if (r.status === 'ok') lines.push(...((r.data as { notes?: string[] }).notes ?? []))
		else if (r.status === 'failed') lines.push(`${r.key} failed (${r.error.code}): ${r.error.message}`)
		else lines.push(`${r.key} is unsupported: ${r.reason}`)
	}
	const unique = [...new Set(lines)]
	return block(
		'notes',
		'Notes',
		unique.length ? `<ul>${unique.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p>0 notes.</p>',
	)
}

/**
 * The page (D2.3, § 5.5 `## Page`): one self-contained HTML document built from the dashboard
 * JSON. Inline CSS and SVG only, no script and no network. Pure and deterministic. A report that is
 * unlisted, failed, or unsupported is named in its own section, never dropped.
 */
export function renderDashboardPage(d: Dashboard): { html: string; sections: PageSection[] } {
	const body = [header(d), burndown(d), health(d), workload(d), velocity(d), notes(d)].join('\n')
	const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${PAGE_MARKER}
<title>Sprint dashboard: ${esc(d.scope)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>
`
	return { html, sections: [...PAGE_SECTIONS] }
}
