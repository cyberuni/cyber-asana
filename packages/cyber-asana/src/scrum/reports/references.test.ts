import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const PACKAGE = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const NAMES = ['cyber-asana.report.interface', 'cyber-asana.report.standup']
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
		expect(result.passed).toBe(2)
	})

	it('lists standup as an implementation of the many-cardinality interface', () => {
		expect(JSON.stringify(agentkit('implementations', 'cyber-asana.report'))).toContain('cyber-asana.report.standup')
	})
})
