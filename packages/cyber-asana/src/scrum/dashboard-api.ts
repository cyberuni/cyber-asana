import { CodedConfigError, isCodedConfigError } from '../platform/coded-error.js'
import { findHtmlSubsetProblems } from '../platform/html-subset.js'
import type { CoreScrumApi, ScrumApiDeps, SprintInput } from './api.js'
import { type DashboardSettings, parseDashboardSettings, type StatusType, statusFor } from './reports/dashboard.js'
import { renderStatusUpdate, statusParentFor } from './reports/status-update.js'
import { selectScope } from './scope.js'

/** The reports the CLI computes itself, by the key `cyber-asana.report.<key>` gives them. */
const BUILT_IN_REPORTS = ['standup', 'sprint', 'retro', 'velocity', 'health', 'workload'] as const
type BuiltInReport = (typeof BUILT_IN_REPORTS)[number]

const REPORT_PREFIX = 'cyber-asana.report.'

type ReportResults = {
	standup: Awaited<ReturnType<CoreScrumApi['reportStandup']>>
	sprint: Awaited<ReturnType<CoreScrumApi['reportSprint']>>
	retro: Awaited<ReturnType<CoreScrumApi['reportRetro']>>
	velocity: Awaited<ReturnType<CoreScrumApi['reportVelocity']>>
	health: Awaited<ReturnType<CoreScrumApi['reportHealth']>>
	workload: Awaited<ReturnType<CoreScrumApi['reportWorkload']>>
}

export type DashboardEntry =
	| { [K in BuiltInReport]: { key: K; status: 'ok'; data: ReportResults[K] } }[BuiltInReport]
	| { key: string; status: 'failed'; error: { code: string; message: string; hint?: string } }
	| { key: string; status: 'unsupported'; reason: string; reference?: string }

const isBuiltIn = (key: string): key is BuiltInReport => (BUILT_IN_REPORTS as readonly string[]).includes(key)

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

/**
 * `report dashboard` (D2.1): runs the reports `cyber-asana.dashboard` lists, in order, into one
 * result. A report the CLI does not compute is named as unsupported with the reference that
 * describes it, and a report that fails with a configuration status is recorded with its code; the
 * rest still run. The dashboard's `status_type` comes from `status_rules` over the health findings.
 */
export function createDashboardApi(deps: ScrumApiDeps, core: CoreScrumApi) {
	async function reportDashboard(input: SprintInput, opts?: Parameters<CoreScrumApi['reportHealth']>[1]) {
		const loaded = await deps.store(opts).load()
		const { scope } = selectScope(loaded.scopes, {
			...(input.scope !== undefined && { name: input.scope }),
			...(loaded.defaultProject && { defaultProject: loaded.defaultProject }),
		})
		const settings: DashboardSettings = await (deps.loadDashboardSettings ?? (async () => parseDashboardSettings({})))()
		const shipped = new Map(
			(deps.listReports ? await deps.listReports() : []).map((r) => [
				r.name.startsWith(REPORT_PREFIX) ? r.name.slice(REPORT_PREFIX.length) : r.name,
				r.name,
			]),
		)
		const run: Record<BuiltInReport, () => Promise<unknown>> = {
			standup: () => core.reportStandup(input, opts),
			sprint: () => core.reportSprint(input, opts),
			retro: () => core.reportRetro(input, opts),
			velocity: () => core.reportVelocity(input.scope !== undefined ? { scope: input.scope } : {}, opts),
			health: () => core.reportHealth(input, opts),
			workload: () => core.reportWorkload(input, opts),
		}

		const reports: DashboardEntry[] = []
		const notes: string[] = []
		for (const key of settings.reports) {
			if (!isBuiltIn(key)) {
				const reference = shipped.get(key)
				const reason = reference
					? `the CLI does not compute ${reference}; follow that reference with the primitive commands it names`
					: `no ${REPORT_PREFIX}${key} implementation is installed, and the CLI does not compute it`
				reports.push({ key, status: 'unsupported', reason, ...(reference && { reference }) })
				notes.push(`Report ${key} is unsupported: ${reason}.`)
				continue
			}
			try {
				reports.push({ key, status: 'ok', data: await run[key]() } as DashboardEntry)
			} catch (error) {
				if (!isCodedConfigError(error)) throw error
				reports.push({
					key,
					status: 'failed',
					error: { code: error.code, message: error.message, ...(error.hint && { hint: error.hint }) },
				})
			}
		}

		const counts = {
			ok: reports.filter((r) => r.status === 'ok').length,
			failed: reports.filter((r) => r.status === 'failed').length,
			unsupported: reports.filter((r) => r.status === 'unsupported').length,
		}
		const health = reports.find((r) => r.key === 'health' && r.status === 'ok') as
			| Extract<DashboardEntry, { key: 'health'; status: 'ok' }>
			| undefined
		let status_type: StatusType | null = null
		let status_basis = 'the health report did not run, so status_rules had nothing to grade'
		if (health) {
			status_type = statusFor(health.data.counts, settings.status_rules)
			status_basis = `health: ${plural(health.data.counts.error, 'error')}, ${plural(health.data.counts.warning, 'warning')}`
		}
		return { scope: scope.name, settings, reports, counts, status_type, status_basis, notes }
	}

	/**
	 * `report dashboard --post-status` (D2.2): the dashboard's status update, rendered from the
	 * `## Status update` template and posted on the scope's project or portfolio. A status update
	 * cannot be edited (A3), so every post is new. Nothing is posted when health did not run, and the
	 * body is checked against Asana's HTML subset first. `dryRun` returns the post without sending it.
	 */
	async function postDashboardStatus(
		input: SprintInput,
		opts?: Parameters<CoreScrumApi['reportHealth']>[1],
		post: { dryRun?: boolean } = {},
	) {
		const dashboard = await reportDashboard(input, opts)
		if (dashboard.status_type === null) {
			throw new CodedConfigError('health-required', `No status update was posted: ${dashboard.status_basis}`, {
				hint: 'Add health to reports in the cyber-asana.dashboard reference and fix whatever made it fail (see the failed entry from `report dashboard`), then retry.',
			})
		}
		const loaded = await deps.store(opts).load()
		const { scope } = selectScope(loaded.scopes, {
			...(input.scope !== undefined && { name: input.scope }),
			...(loaded.defaultProject && { defaultProject: loaded.defaultProject }),
		})
		const parent = statusParentFor(scope, dashboard.settings.status_parent)
		if (!deps.loadStatusTemplate) {
			throw new CodedConfigError('status-template-invalid', 'This build cannot load the cyber-asana.dashboard template')
		}
		const { title, html_text } = renderStatusUpdate(await deps.loadStatusTemplate(), dashboard as never)
		const problems = findHtmlSubsetProblems(html_text)
		if (problems.length > 0) {
			throw new CodedConfigError(
				'status-body-invalid',
				`The status update body is not valid Asana HTML: ${problems.join('; ')}`,
				{
					hint: 'Fix the "## Status update" section of the cyber-asana.dashboard reference (see the tidy-description reference for the subset), then retry.',
				},
			)
		}
		const base = {
			scope: dashboard.scope,
			parent,
			status_type: dashboard.status_type,
			status_basis: dashboard.status_basis,
			title,
			html_text,
			notes: ['A status update cannot be edited in Asana, so every post is a new update and the history builds up.'],
		}
		if (post.dryRun) return { ...base, posted: false, dry_run: true }
		if (!deps.history) {
			throw new CodedConfigError(
				'history-unavailable',
				'This build has no status-update gateway to post a status update',
			)
		}
		const created = await deps.history.statuses.createStatus(parent.gid, {
			status_type: dashboard.status_type,
			title,
			html_text,
		})
		return {
			...base,
			posted: true,
			dry_run: false,
			status_update: { gid: created.gid, ...(created.created_at && { created_at: created.created_at }) },
		}
	}

	return { reportDashboard, postDashboardStatus }
}
