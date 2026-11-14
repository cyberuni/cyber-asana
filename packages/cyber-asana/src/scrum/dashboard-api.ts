import { isCodedConfigError } from '../platform/coded-error.js'
import type { CoreScrumApi, ScrumApiDeps, SprintInput } from './api.js'
import { type DashboardSettings, parseDashboardSettings, type StatusType, statusFor } from './reports/dashboard.js'
import { selectScope } from './scope.js'

/** The reports the CLI computes itself, by the key `cyber-asana.report.<key>` gives them. */
export const BUILT_IN_REPORTS = ['standup', 'sprint', 'retro', 'velocity', 'health', 'workload'] as const
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
	return {
		async reportDashboard(input: SprintInput, opts?: Parameters<CoreScrumApi['reportHealth']>[1]) {
			const loaded = await deps.store(opts).load()
			const { scope } = selectScope(loaded.scopes, {
				...(input.scope !== undefined && { name: input.scope }),
				...(loaded.defaultProject && { defaultProject: loaded.defaultProject }),
			})
			const settings: DashboardSettings = await (
				deps.loadDashboardSettings ?? (async () => parseDashboardSettings({}))
			)()
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
		},
	}
}
