import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = path.resolve(import.meta.dirname, '../../..')
const files = ['skills/init-asana/SKILL.md', 'skills/pin-asana-projects/SKILL.md']

describe('skill docs', () => {
	it('pin `npx cyber-asana` invocations to an explicit version', async () => {
		const unpinnedPattern = /npx(?: --yes)? cyber-asana(?!@)/g

		for (const relativePath of files) {
			const content = await readFile(path.join(repoRoot, relativePath), 'utf8')
			expect(content).not.toMatch(unpinnedPattern)
		}
	})
})
