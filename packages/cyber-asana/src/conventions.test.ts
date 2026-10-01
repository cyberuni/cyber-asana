import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadConventions, packageRoot, parseConventions } from './conventions.js'

const REFERENCE = 'cyber-asana.task-conventions.md'

async function writeText(path: string, text: string) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, text)
}

describe('parseConventions', () => {
	it('keeps the three convention keys and ignores other frontmatter', () => {
		expect(
			parseConventions({
				description: 'How to shape Asana work',
				tags: ['asana'],
				merge: 'merge-sections',
				task_name_format: '<area>: <summary>',
				description_template: '## Context',
				default_tags: ['agent-created'],
			}),
		).toEqual({
			task_name_format: '<area>: <summary>',
			description_template: '## Context',
			default_tags: ['agent-created'],
		})
	})

	it('returns undefined when no convention key is set', () => {
		expect(parseConventions({ description: 'x' })).toBeUndefined()
	})

	it('rejects a default_tags that is not a list of non-empty strings', () => {
		expect(() => parseConventions({ default_tags: [''] })).toThrow('default_tags')
	})

	it('rejects an empty task_name_format', () => {
		expect(() => parseConventions({ task_name_format: '' })).toThrow('task_name_format')
	})
})

describe('packageRoot', () => {
	it('finds this package from a source file', () => {
		expect(packageRoot(fileURLToPath(import.meta.url))).toBe(resolve(dirname(fileURLToPath(import.meta.url)), '..'))
	})

	it('finds the package from a built file', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'cyber-asana-pkg-'))
		try {
			await writeText(join(dir, 'package.json'), '{}')
			expect(packageRoot(join(dir, 'dist', 'cli.js'))).toBe(dir)
		} finally {
			await rm(dir, { recursive: true, force: true })
		}
	})
})

describe('loadConventions', () => {
	let base: string
	let root: string
	let home: string
	let plugin: string
	const warn = vi.fn()

	function load() {
		return loadConventions({ root, home, platform: 'linux', env: {}, packageRoot: plugin, warn })
	}

	beforeEach(async () => {
		base = await mkdtemp(join(tmpdir(), 'cyber-asana-conventions-'))
		root = join(base, 'repo')
		home = join(base, 'home')
		plugin = join(base, 'plugin')
		await mkdir(join(root, '.git'), { recursive: true })
		await mkdir(home, { recursive: true })
		await writeText(join(plugin, 'package.json'), '{"name":"cyber-asana"}')
		await writeText(join(plugin, 'references', REFERENCE), '---\ndescription: shipped\n---\n\n## Task\n')
	})

	afterEach(async () => {
		warn.mockReset()
		await rm(base, { recursive: true, force: true })
	})

	it('returns undefined when the shipped copy sets no convention keys', async () => {
		expect(await load()).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
	})

	it('reads the shipped copy of this package by default', async () => {
		expect(await loadConventions({ root, home, platform: 'linux', env: {}, warn })).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
	})

	it('reads the settings from a repo reference', async () => {
		await writeText(
			join(root, '.agents', 'references', REFERENCE),
			'---\nmerge: merge-sections\ntask_name_format: "<area>: <summary>"\ndefault_tags: [agent-created]\n---\n',
		)
		expect(await load()).toEqual({ task_name_format: '<area>: <summary>', default_tags: ['agent-created'] })
	})

	it('merges the layers key by key, the higher layer winning', async () => {
		await writeText(
			join(root, '.agents', 'references', REFERENCE),
			'---\nmerge: merge-sections\ndefault_tags: [repo]\n---\n',
		)
		await writeText(
			join(home, '.agents', 'references', REFERENCE),
			'---\nmerge: merge-sections\ndefault_tags: [user]\ndescription_template: "## Why"\n---\n',
		)
		expect(await load()).toEqual({ default_tags: ['repo'], description_template: '## Why' })
	})

	it('throws when a convention value is invalid', async () => {
		await writeText(join(root, '.agents', 'references', REFERENCE), '---\ndefault_tags: nope\n---\n')
		await expect(load()).rejects.toThrow('default_tags')
	})

	it('warns and returns undefined when another plugin also ships the reference', async () => {
		await writeText(join(root, 'package.json'), '{"dependencies":{"other-plugin":"1.0.0"}}')
		const other = join(root, 'node_modules', 'other-plugin')
		await writeText(join(other, 'package.json'), '{"name":"other-plugin","version":"1.0.0"}')
		await writeText(join(other, 'references', REFERENCE), '---\ndefault_tags: [other]\n---\n')

		expect(await load()).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('ambiguous'))
	})

	it('treats another installed copy of cyber-asana as itself, not as a second plugin', async () => {
		await writeText(join(root, 'package.json'), '{"dependencies":{"cyber-asana":"1.0.0"}}')
		const copy = join(root, 'node_modules', 'cyber-asana')
		await writeText(join(copy, 'package.json'), '{"name":"cyber-asana","version":"1.0.0"}')
		await writeText(join(copy, 'references', REFERENCE), '---\ndefault_tags: [stale]\n---\n')

		expect(await load()).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
	})
})
