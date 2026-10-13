import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * repobuddy's `issue` and `epic` skills find this reference by the `project-tracker.capabilities`
 * prefix and read it against its `project-tracker.contract`. These checks keep the reference in
 * the contract's shape without depending on repobuddy.
 */

const file = path.resolve(import.meta.dirname, '../references/project-tracker.capabilities.asana.md')
const text = readFileSync(file, 'utf8')

const SECTIONS = ['Tracker', 'Detect', 'Kinds', 'Search', 'Create', 'Link', 'Retype', 'Close', 'Url']

function section(name: string): string {
	const match = text.match(new RegExp(`^## ${name}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))
	return match?.[1] ?? ''
}

describe('project-tracker.capabilities.asana', () => {
	it('declares contract 1', () => {
		expect(text).toMatch(/^---\n[\s\S]*?^contract: 1$/m)
	})

	it('has the contract sections in order', () => {
		const headings = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1])
		expect(headings).toEqual(SECTIONS)
	})

	it('is private and never offers to copy into a public tracker', () => {
		expect(section('Tracker')).toMatch(/Visibility: private/)
		expect(section('Tracker')).toMatch(/no operation here offers to copy/)
	})

	it('holds issue and epic, and leaves initiative unsupported', () => {
		expect(section('Tracker')).toMatch(/Levels held: issue, epic\./)
		expect(section('Retype')).toMatch(/epic → initiative \| not supported/)
		expect(section('Retype')).toMatch(/initiative → epic \| not supported/)
	})

	it('names no relative link, since a reference is read from a merged layer', () => {
		expect(text).not.toMatch(/\]\(\.\.?\//)
	})
})
