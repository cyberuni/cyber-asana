import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { loadConventions } from './conventions.js'
import { migrateConventions, referencePath } from './migrate-conventions.js'
import { loadRepoConfig } from './repo-config.js'

const CONVENTIONS = {
	task_name_format: '<area>: <summary>',
	description_template: '## Context\n\n## Done when\n',
	default_tags: ['agent-created'],
}

function frontmatter(text: string) {
	const match = /^---\n([\s\S]*?)\n?---\n/.exec(text)
	return match ? parse(match[1] as string) : undefined
}

describe('migrateConventions', () => {
	let root: string
	let configPath: string
	let reference: string

	async function writeConfig(config: unknown) {
		await writeFile(configPath, JSON.stringify(config, null, 2))
	}

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-migrate-'))
		await mkdir(join(root, '.git'))
		await mkdir(join(root, '.agents'))
		configPath = join(root, '.agents', 'cyber-asana.json')
		reference = join(root, '.agents', 'references', 'cyber-asana.work-hierarchy.md')
	})

	afterEach(async () => {
		await rm(root, { recursive: true, force: true })
	})

	it('creates the repo reference with merge-sections and the keys, and drops the block', async () => {
		await writeConfig({ schema_version: 2, projects: [], conventions: CONVENTIONS })

		const result = await migrateConventions({ configPath, root })

		expect(result).toEqual({
			config: configPath,
			reference,
			keys: ['task_name_format', 'description_template', 'default_tags'],
			created: true,
			written: true,
		})
		const text = await readFile(reference, 'utf8')
		expect(frontmatter(text)).toEqual({ merge: 'merge-sections', ...CONVENTIONS })
		expect(text.replace(/^---\n[\s\S]*?---\n/, '').trim()).toBe('')
		expect(await loadRepoConfig(configPath)).toEqual({ schema_version: 2, projects: [] })
	})

	it('produces settings the loader reads back', async () => {
		await writeConfig({ schema_version: 2, projects: [], conventions: CONVENTIONS })
		await migrateConventions({ configPath, root })

		expect(await loadConventions({ root, home: join(root, 'home'), platform: 'linux', env: {} })).toEqual(CONVENTIONS)
	})

	it('adds the keys to an existing reference, keeping its frontmatter and body', async () => {
		await mkdir(join(root, '.agents', 'references'))
		await writeFile(reference, '---\n# keep me\nmerge: merge-sections\ndescription: ours\n---\n\n## Task\n\nBody.\n')
		await writeConfig({ schema_version: 2, projects: [], conventions: { default_tags: ['x'] } })

		const result = await migrateConventions({ configPath, root })

		expect(result.created).toBe(false)
		const text = await readFile(reference, 'utf8')
		expect(text).toContain('# keep me')
		expect(text).toMatch(/---\n\n## Task\n\nBody\.\n$/)
		expect(frontmatter(text)).toEqual({ merge: 'merge-sections', description: 'ours', default_tags: ['x'] })
	})

	it('adds frontmatter to an existing reference that has none', async () => {
		await mkdir(join(root, '.agents', 'references'))
		await writeFile(reference, '## Task\n')
		await writeConfig({ schema_version: 2, projects: [], conventions: { default_tags: ['x'] } })

		await migrateConventions({ configPath, root })

		const text = await readFile(reference, 'utf8')
		expect(frontmatter(text)).toEqual({ default_tags: ['x'] })
		expect(text).toMatch(/---\n## Task\n$/)
	})

	it('refuses a key the reference already sets, writing nothing', async () => {
		await mkdir(join(root, '.agents', 'references'))
		const original = '---\ndefault_tags: [theirs]\n---\n'
		await writeFile(reference, original)
		await writeConfig({ schema_version: 2, projects: [], conventions: { default_tags: ['x'] } })

		await expect(migrateConventions({ configPath, root })).rejects.toThrow(/default_tags/)
		expect(await readFile(reference, 'utf8')).toBe(original)
		expect(JSON.parse(await readFile(configPath, 'utf8')).conventions).toEqual({ default_tags: ['x'] })
	})

	it('writes nothing on a dry run', async () => {
		await writeConfig({ schema_version: 2, projects: [], conventions: CONVENTIONS })
		const before = await readFile(configPath, 'utf8')

		const result = await migrateConventions({ configPath, root, dryRun: true })

		expect(result).toMatchObject({ created: true, written: false })
		await expect(readFile(reference, 'utf8')).rejects.toThrow()
		expect(await readFile(configPath, 'utf8')).toBe(before)
	})

	it('reports nothing to migrate when the config has no block', async () => {
		await writeConfig({ schema_version: 2, projects: [] })

		expect(await migrateConventions({ configPath, root })).toEqual({
			config: configPath,
			reference,
			keys: [],
			created: false,
			written: false,
		})
	})

	it('rejects an unknown key in the block', async () => {
		await writeConfig({ schema_version: 2, projects: [], conventions: { naming: 'x' } })

		await expect(migrateConventions({ configPath, root })).rejects.toThrow('conventions.naming')
	})

	it('rejects an invalid value in the block', async () => {
		await writeConfig({ schema_version: 2, projects: [], conventions: { default_tags: 'x' } })

		await expect(migrateConventions({ configPath, root })).rejects.toThrow('default_tags')
	})
})

describe('referencePath', () => {
	it('puts the reference beside a config in .agents', () => {
		expect(referencePath('/repo/.agents/cyber-asana.json', '/elsewhere')).toBe(
			join('/repo', '.agents', 'references', 'cyber-asana.work-hierarchy.md'),
		)
	})

	it('falls back to the given root for a config elsewhere', () => {
		expect(referencePath('/tmp/config.json', '/repo')).toBe(
			join('/repo', '.agents', 'references', 'cyber-asana.work-hierarchy.md'),
		)
	})
})
