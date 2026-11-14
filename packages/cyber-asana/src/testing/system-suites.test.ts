import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	exitCodeFor,
	formatSummary,
	SYSTEM_SUITES,
	skipReason,
	summarizeRun,
	type VitestJsonReport,
} from './system-suites.js'

function findSystemFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name)
		if (statSync(path).isDirectory()) return findSystemFiles(path)
		return name.endsWith('.system.ts') ? [path] : []
	})
}

const report = (files: Record<string, string[]>): VitestJsonReport => ({
	testResults: Object.entries(files).map(([name, statuses]) => ({
		name: `/repo/packages/cyber-asana/${name}`,
		assertionResults: statuses.map((status, i) => ({ status, fullName: `t${i}` })),
	})),
})

describe('SYSTEM_SUITES', () => {
	it('has a row for every *.system.ts on disk, and none for a file that is gone', () => {
		const onDisk = findSystemFiles('src')
			.map((p) => relative('.', p))
			.sort()
		expect(SYSTEM_SUITES.map((s) => s.file).sort()).toEqual(onDisk)
	})
})

describe('skipReason', () => {
	const suite = { file: 'a.system.ts', env: ['X_GID'], paid: true }
	it('names every missing variable and the plan', () => {
		expect(skipReason(suite, {})).toBe('missing ASANA_SYSTEM_TEST, ASANA_ACCESS_TOKEN, X_GID; needs ASANA_PLAN=paid')
	})
	it('treats an unexpanded placeholder as missing', () => {
		const env = { ASANA_SYSTEM_TEST: '1', ASANA_ACCESS_TOKEN: 't', ASANA_PLAN: 'paid', X_GID: '${X_GID}' }
		expect(skipReason(suite, env)).toBe('missing X_GID')
	})
	it('is undefined when nothing is missing', () => {
		const env = { ASANA_SYSTEM_TEST: '1', ASANA_ACCESS_TOKEN: 't', ASANA_PLAN: 'paid', X_GID: '1' }
		expect(skipReason(suite, env)).toBeUndefined()
	})
})

describe('summarizeRun', () => {
	const env = { ASANA_SYSTEM_TEST: '1', ASANA_ACCESS_TOKEN: 't' }
	const suites = [
		{ file: 'src/a.system.ts', env: [] },
		{ file: 'src/b.system.ts', env: ['B_GID'] },
		{ file: 'src/c.system.ts', env: [] },
		{ file: 'src/d.system.ts', env: [] },
	]

	it('classifies passed, failed and skipped, with the reason for a skip', () => {
		const result = summarizeRun(
			report({
				'src/a.system.ts': ['passed', 'passed'],
				'src/b.system.ts': ['skipped'],
				'src/c.system.ts': ['passed', 'failed'],
			}),
			suites,
			env,
		)
		expect(result.map((s) => [s.file, s.status])).toEqual([
			['src/a.system.ts', 'passed'],
			['src/b.system.ts', 'skipped'],
			['src/c.system.ts', 'failed'],
			['src/d.system.ts', 'skipped'],
		])
		expect(result[1]!.reason).toBe('missing B_GID')
		expect(result[3]!.reason).toBe('vitest reported no tests for this file')
	})

	it('counts skipped tests inside a file that ran', () => {
		const [a] = summarizeRun(report({ 'src/a.system.ts': ['passed', 'skipped'] }), suites, env)
		expect(a).toMatchObject({ status: 'passed', passed: 1, skipped: 1 })
	})

	it('flags a skip whose variables are all present as skipped inside the suite', () => {
		const [a] = summarizeRun(report({ 'src/a.system.ts': ['skipped'] }), suites, env)
		expect(a!.reason).toBe('skipped by a condition inside the suite, not by a missing variable we know of')
	})

	it('reports a failed file even when no assertion failed', () => {
		const r: VitestJsonReport = {
			testResults: [{ name: '/x/src/a.system.ts', status: 'failed', message: 'boom', assertionResults: [] }],
		}
		expect(summarizeRun(r, suites, env)[0]).toMatchObject({ status: 'failed' })
	})
})

describe('exitCodeFor and formatSummary', () => {
	const env = { ASANA_SYSTEM_TEST: '1', ASANA_ACCESS_TOKEN: 't' }
	const suites = [
		{ file: 'src/a.system.ts', env: [] },
		{ file: 'src/b.system.ts', env: ['B_GID'], optional: true },
	]
	it('is 0 only when every required suite ran and passed', () => {
		const ok = summarizeRun(report({ 'src/a.system.ts': ['passed'] }), suites, env)
		expect(exitCodeFor(ok, suites)).toBe(0)
	})
	it('is 1 on a failure, and 3 when a required suite skipped', () => {
		const bad = summarizeRun(report({ 'src/a.system.ts': ['failed'] }), suites, env)
		expect(exitCodeFor(bad, suites)).toBe(1)
		const skipped = summarizeRun(report({ 'src/a.system.ts': ['skipped'] }), suites, env)
		expect(exitCodeFor(skipped, suites)).toBe(3)
	})
	it('never prints a skip as a pass', () => {
		const text = formatSummary(summarizeRun(report({ 'src/a.system.ts': ['skipped'] }), suites, env))
		expect(text).toContain('SKIPPED  src/a.system.ts')
		expect(text).toContain('0 passed, 0 failed, 2 skipped')
		expect(text).not.toContain('PASSED  src/a.system.ts')
	})
})
