import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const IMPLEMENTATIONS = [
	'cyber-asana.report.standup',
	'cyber-asana.report.sprint',
	'cyber-asana.report.retro',
	'cyber-asana.report.velocity',
	'cyber-asana.report.health',
	'cyber-asana.report.workload',
]
const NAMES = ['cyber-asana.report.interface', ...IMPLEMENTATIONS]
const repo = mkdtempSync(join(tmpdir(), 'ca-refs-'))
afterAll(() => rmSync(repo, { recursive: true, force: true }))

function agentkit(...args: string[]) {
	return JSON.parse(
		execFileSync(
			join(PACKAGE, 'node_modules/.bin/cyber-agentkit'),
			['reference', ...args, '--root', repo, '--format', 'json'],
			{ encoding: 'utf8', cwd: repo },
		),
	)
}

describe('report references', () => {
	execFileSync('git', ['init', '-q', repo])
	mkdirSync(join(repo, '.agents/references'), { recursive: true })
	for (const name of NAMES)
		copyFileSync(join(PACKAGE, `references/${name}.md`), join(repo, `.agents/references/${name}.md`))

	it('are accepted by cyber-agentkit reference check', () => {
		const result = agentkit('check', ...NAMES)
		expect(result.failed ?? []).toEqual([])
		expect(result.passed).toBe(NAMES.length)
	})

	it('lists every report as an implementation of the many-cardinality interface', () => {
		const listed = JSON.stringify(agentkit('implementations', 'cyber-asana.report'))
		for (const name of IMPLEMENTATIONS) expect(listed).toContain(name)
	})

	it('lists health as an implementation too', () => {
		expect(JSON.stringify(agentkit('implementations', 'cyber-asana.report'))).toContain('cyber-asana.report.health')
	})

	it('ships health frontmatter that parses to the defaults', async () => {
		const { readFileSync } = await import('node:fs')
		const { parseHealthSettings, DEFAULT_HEALTH_SETTINGS } = await import('./health.js')
		const front = readFileSync(join(PACKAGE, 'references/cyber-asana.report.health.md'), 'utf8').split('---')[1] ?? ''
		const yaml = (await import('yaml')).parse(front)
		expect(parseHealthSettings(yaml)).toEqual(DEFAULT_HEALTH_SETTINGS)
		expect(yaml.checks).toHaveLength(11)
	})

	it('lists workload as an implementation too', () => {
		expect(JSON.stringify(agentkit('implementations', 'cyber-asana.report'))).toContain('cyber-asana.report.workload')
	})

	it('ships workload frontmatter that parses to the defaults', async () => {
		const { readFileSync } = await import('node:fs')
		const { parseWorkloadSettings, DEFAULT_WORKLOAD_SETTINGS } = await import('./workload.js')
		const front = readFileSync(join(PACKAGE, 'references/cyber-asana.report.workload.md'), 'utf8').split('---')[1] ?? ''
		const yaml = (await import('yaml')).parse(front)
		expect(parseWorkloadSettings(yaml)).toEqual(DEFAULT_WORKLOAD_SETTINGS)
		expect(yaml).toMatchObject({ over_allocation_pct: 100, under_allocation_pct: 60 })
	})
})
