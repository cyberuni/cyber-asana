import { isUnexpandedPlaceholder } from '../platform/env.js'

/**
 * One row per `*.system.ts`: what must be set for it to run rather than skip.
 * `system-suites.test.ts` fails when a suite on disk has no row, so a new suite adds its own.
 */
export type SystemSuite = {
	file: string
	/** Variables the suite reads and skips without, beyond `ASANA_SYSTEM_TEST` and the token. */
	env: string[]
	/** Needs `ASANA_PLAN=paid` (Asana answers Payment Required to it on a free plan). */
	paid?: boolean
	/** An opt-in suite: its skip is reported but does not fail the run. */
	optional?: boolean
}

export const SYSTEM_SUITES: SystemSuite[] = [
	{ file: 'src/ai-studio/api.system.ts', env: ['ASANA_WORKSPACE_GID', 'ASANA_SYSTEM_TEST_AI_STUDIO'], optional: true },
	{ file: 'src/attachments/api.system.ts', env: ['ASANA_SYSTEM_TEST_TASK_GID'] },
	{
		file: 'src/custom-fields/api.system.ts',
		env: ['ASANA_WORKSPACE_GID', 'ASANA_SYSTEM_TEST_PROJECT_GID'],
		paid: true,
	},
	{ file: 'src/goals/api.system.ts', env: ['ASANA_WORKSPACE_GID'], paid: true },
	{ file: 'src/memberships/api.system.ts', env: ['ASANA_SYSTEM_TEST_PROJECT_GID'] },
	{ file: 'src/ooo/api.system.ts', env: ['ASANA_WORKSPACE_GID'] },
	{ file: 'src/portfolios/api.system.ts', env: ['ASANA_WORKSPACE_GID'], paid: true },
	{ file: 'src/project-templates/api.system.ts', env: ['ASANA_WORKSPACE_GID'] },
	{ file: 'src/projects/api.system.ts', env: ['ASANA_WORKSPACE_GID'] },
	{ file: 'src/scrum/sprint-sections.system.ts', env: ['ASANA_WORKSPACE_GID', 'ASANA_SYSTEM_TEST_PROJECT_GID'] },
	{ file: 'src/search/api.system.ts', env: ['ASANA_WORKSPACE_GID'] },
	{ file: 'src/sections/api.system.ts', env: ['ASANA_SYSTEM_TEST_PROJECT_GID'] },
	{ file: 'src/skills/html-subset.system.ts', env: ['ASANA_WORKSPACE_GID'] },
	{ file: 'src/stories/api.system.ts', env: ['ASANA_SYSTEM_TEST_TASK_GID'] },
	{ file: 'src/tags/api.system.ts', env: ['ASANA_WORKSPACE_GID'] },
	{
		file: 'src/tasks/api.system.ts',
		env: [
			'ASANA_WORKSPACE_GID',
			'ASANA_SYSTEM_TEST_PROJECT_GID',
			'ASANA_SYSTEM_TEST_TASK_GID',
			'ASANA_SYSTEM_TEST_SECOND_TASK_GID',
		],
	},
	{ file: 'src/task-templates/api.system.ts', env: ['ASANA_SYSTEM_TEST_PROJECT_GID'] },
	{ file: 'src/teams/api.system.ts', env: ['ASANA_WORKSPACE_GID'] },
	{ file: 'src/workspaces/api.system.ts', env: [] },
]

type Env = Record<string, string | undefined>

function present(env: Env, name: string): boolean {
	const value = env[name]
	return value !== undefined && value !== '' && !isUnexpandedPlaceholder(value)
}

/** Why a suite would skip under `env`, or `undefined` when nothing it needs is missing. */
export function skipReason(suite: Pick<SystemSuite, 'env' | 'paid'>, env: Env): string | undefined {
	const missing = ['ASANA_SYSTEM_TEST', 'ASANA_ACCESS_TOKEN', ...suite.env].filter((name) => !present(env, name))
	const parts: string[] = []
	if (missing.length > 0) parts.push(`missing ${missing.join(', ')}`)
	if (suite.paid && env.ASANA_PLAN !== 'paid') parts.push('needs ASANA_PLAN=paid')
	return parts.length > 0 ? parts.join('; ') : undefined
}

export type VitestJsonReport = {
	testResults: {
		name: string
		status?: string
		message?: string
		assertionResults: { status: string; fullName?: string }[]
	}[]
}

export type SuiteResult = {
	file: string
	status: 'passed' | 'failed' | 'skipped'
	passed: number
	failed: number
	skipped: number
	reason?: string
}

/** One result per registered suite, in registry order; a suite absent from the report counts as skipped. */
export function summarizeRun(
	report: VitestJsonReport,
	suites: Pick<SystemSuite, 'file' | 'env' | 'paid'>[],
	env: Env,
): SuiteResult[] {
	return suites.map((suite) => {
		const entry = report.testResults.find((r) => r.name.endsWith(`/${suite.file}`))
		const count = (status: string) => entry?.assertionResults.filter((a) => a.status === status).length ?? 0
		const passed = count('passed')
		const failed = count('failed')
		const skipped = entry?.assertionResults.filter((a) => a.status === 'skipped' || a.status === 'pending').length ?? 0
		const base = { file: suite.file, passed, failed, skipped }
		if (failed > 0 || entry?.status === 'failed') return { ...base, status: 'failed' as const }
		if (passed > 0) return { ...base, status: 'passed' as const }
		const reason =
			skipReason(suite, env) ??
			(entry
				? 'skipped by a condition inside the suite, not by a missing variable we know of'
				: 'vitest reported no tests for this file')
		return { ...base, status: 'skipped' as const, reason }
	})
}

/** 0 every required suite passed; 1 a suite failed; 3 no failure, but a required suite skipped. */
export function exitCodeFor(results: SuiteResult[], suites: Pick<SystemSuite, 'file' | 'optional'>[]): 0 | 1 | 3 {
	if (results.some((r) => r.status === 'failed')) return 1
	const optional = new Set(suites.filter((s) => s.optional).map((s) => s.file))
	return results.some((r) => r.status === 'skipped' && !optional.has(r.file)) ? 3 : 0
}

export function formatSummary(results: SuiteResult[]): string {
	const label = { passed: 'PASSED ', failed: 'FAILED ', skipped: 'SKIPPED' } as const
	const lines = results.map((r) => {
		const detail =
			r.status === 'skipped'
				? ` (${r.reason})`
				: r.skipped > 0
					? ` (${r.passed} passed, ${r.skipped} tests skipped inside)`
					: ''
		return `${label[r.status]}  ${r.file}${detail}`
	})
	const n = (status: SuiteResult['status']) => results.filter((r) => r.status === status).length
	return [
		...lines,
		'',
		`${n('passed')} passed, ${n('failed')} failed, ${n('skipped')} skipped (of ${results.length} suites)`,
	].join('\n')
}
