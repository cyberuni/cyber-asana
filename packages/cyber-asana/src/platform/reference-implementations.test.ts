import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listReferenceImplementations } from './reference-implementations.js'

const INTERFACE = `---
description: An example interface.
interface:
  cardinality: many
  version: 1
  sections:
    - heading: Audience
      required: true
      holds: Who reads it.
---

## Audience

Say who.
`

const impl = (description: string) =>
	`---\ndescription: ${description}\nimplements: cyber-asana.example@1\n---\n\n## Audience\n\nTeam.\n`

async function writeText(path: string, text: string) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, text)
}

describe('listReferenceImplementations', () => {
	let base: string
	let root: string
	let plugin: string
	const list = () =>
		listReferenceImplementations('cyber-asana.example', {
			root,
			home: join(base, 'home'),
			platform: 'linux',
			env: {},
			packageRoot: plugin,
		})

	beforeEach(async () => {
		base = await mkdtemp(join(tmpdir(), 'cyber-asana-impls-'))
		root = join(base, 'repo')
		plugin = join(base, 'plugin')
		await mkdir(join(root, '.git'), { recursive: true })
		await mkdir(join(base, 'home'), { recursive: true })
		await writeText(join(plugin, 'package.json'), '{"name":"cyber-asana"}')
		await writeText(join(plugin, 'references', 'cyber-asana.example.interface.md'), INTERFACE)
		await writeText(join(plugin, 'references', 'cyber-asana.example.alpha.md'), impl('shipped alpha'))
	})

	afterEach(async () => {
		await rm(base, { recursive: true, force: true })
	})

	it('lists the implementations the package ships, by name', async () => {
		const found = await list()
		expect(found.map((f) => f.name)).toEqual(['cyber-asana.example.alpha'])
		expect(found[0]?.description).toBe('shipped alpha')
	})

	it("adds a repo's own implementation", async () => {
		await writeText(join(root, '.agents/references/cyber-asana.example.beta.md'), impl('the repo beta'))
		const names = (await list()).map((f) => f.name)
		expect(names).toContain('cyber-asana.example.alpha')
		expect(names).toContain('cyber-asana.example.beta')
	})

	it('is empty for an interface nobody ships', async () => {
		expect(
			await listReferenceImplementations('cyber-asana.nothing', {
				root,
				home: join(base, 'home'),
				platform: 'linux',
				env: {},
				packageRoot: plugin,
			}),
		).toEqual([])
	})
})
