import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRuntimeContext } from '../composition.js'
import { envValue } from '../platform/env.js'
import { loadEnvFiles } from './load-env.js'
import { systemEnv } from './system.js'
import { ensureSystemFixtures, formatFixtureEnv } from './system-fixtures.js'
import { exitCodeFor, formatSummary, SYSTEM_SUITES, summarizeRun, type VitestJsonReport } from './system-suites.js'

// Same precedence as the system config: a variable already exported wins over a `.env` file.
loadEnvFiles(['.env', '../../.env'])

if (!envValue('ASANA_ACCESS_TOKEN')) {
	console.error('ASANA_ACCESS_TOKEN is not set. Export a personal access token for a paid workspace, then re-run.')
	process.exit(2)
}

process.env.ASANA_SYSTEM_TEST = '1'
process.env.ASANA_PLAN = 'paid'

const projectGid = process.argv[2] ?? systemEnv('ASANA_SYSTEM_TEST_PROJECT_GID')
const workspaceGid = systemEnv('ASANA_WORKSPACE_GID')
const target = projectGid ? { projectGid } : workspaceGid ? { workspaceGid } : undefined
if (!target) {
	console.error('usage: pnpm test:system:paid [project-gid]  (without one, set ASANA_WORKSPACE_GID)')
	process.exit(2)
}

console.log('Preparing fixtures (idempotent; created fixtures stay in place)...')
const fixtures = await ensureSystemFixtures(createRuntimeContext(), target)
const fixtureEnv = formatFixtureEnv(fixtures)
console.log(fixtureEnv)
for (const line of fixtureEnv.split('\n')) {
	const [name, value] = line.split('=') as [string, string]
	process.env[name] = value
}

const dir = mkdtempSync(join(tmpdir(), 'cyber-asana-system-'))
const outputFile = join(dir, 'report.json')
let code = 1
try {
	console.log('\nRunning system suites...\n')
	const run = spawnSync(
		'pnpm',
		[
			'exec',
			'vitest',
			'run',
			'--config',
			'vitest.system.config.ts',
			'--reporter=default',
			'--reporter=json',
			`--outputFile.json=${outputFile}`,
		],
		{ stdio: 'inherit', env: process.env },
	)
	try {
		const report = JSON.parse(readFileSync(outputFile, 'utf8')) as VitestJsonReport
		const results = summarizeRun(report, SYSTEM_SUITES, process.env)
		console.log(`\n=== System test summary ===\n${formatSummary(results)}`)
		code = exitCodeFor(results, SYSTEM_SUITES)
		if (code === 3) console.log('\nExit 3: nothing failed, but a required suite did not run. That is not a pass.')
	} catch {
		console.error(`\nvitest produced no report (exit ${run.status}); no suite result can be trusted.`)
	}
} finally {
	rmSync(dir, { recursive: true, force: true })
}
process.exit(code)
