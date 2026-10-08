import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * npm renders the readme from the tarball, which packs from this package directory. The repo-root
 * readme.md is the single source; `prepack` copies it in, so links in it must not be repo-relative.
 */

const packageRoot = path.resolve(import.meta.dirname, '..')
type Pack = { files: Array<{ path: string }> }

const rootReadme = path.resolve(packageRoot, '../../readme.md')

describe('the published readme', () => {
	it('is packed into the tarball from the repo-root readme', () => {
		const output = JSON.parse(
			execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: packageRoot, encoding: 'utf8' }),
		) as Pack[] | Record<string, Pack>
		// npm 11 keys the report by package name; older npm returns an array.
		const [pack] = Object.values(output)
		expect(pack.files.map((f) => f.path)).toContain('readme.md')
		expect(readFileSync(path.join(packageRoot, 'readme.md'), 'utf8')).toBe(readFileSync(rootReadme, 'utf8'))
	}, 30_000)

	it('links only to absolute URLs or in-page anchors, so links resolve on npmjs.com', () => {
		const targets = [...readFileSync(rootReadme, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1])
		expect(targets.filter((t) => !/^(https?:|mailto:|#)/.test(t))).toEqual([])
	})
})
