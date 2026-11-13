import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { buildErrorBody } from './error-body.js'
import {
	isReferenceAmbiguousError,
	loadReferenceMetadata,
	packageRoot,
	REFERENCE_AMBIGUOUS,
	ReferenceAmbiguousError,
} from './reference-metadata.js'

const NAME = 'cyber-asana.example'
const FILE = `${NAME}.md`

async function writeText(path: string, text: string) {
	await mkdir(dirname(path), { recursive: true })
	await writeFile(path, text)
}

describe('packageRoot', () => {
	it('finds this package from a source file', () => {
		expect(packageRoot(fileURLToPath(import.meta.url))).toBe(
			resolve(dirname(fileURLToPath(import.meta.url)), '..', '..'),
		)
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

describe('loadReferenceMetadata', () => {
	let base: string
	let root: string
	let home: string
	let plugin: string

	function load<T>(parse: (metadata: Record<string, unknown>) => T, name = NAME) {
		return loadReferenceMetadata(name, parse, { root, home, platform: 'linux', env: {}, packageRoot: plugin })
	}
	const identity = (metadata: Record<string, unknown>) => metadata

	async function installOtherPlugin(file = FILE) {
		await writeText(join(root, 'package.json'), '{"dependencies":{"other-plugin":"1.0.0"}}')
		const other = join(root, 'node_modules', 'other-plugin')
		await writeText(join(other, 'package.json'), '{"name":"other-plugin","version":"1.0.0"}')
		await writeText(join(other, 'plugin.json'), '{"name":"other-plugin"}')
		await writeText(join(other, 'references', file), '---\nkey: other\n---\n\n## Body\n')
	}

	beforeEach(async () => {
		base = await mkdtemp(join(tmpdir(), 'cyber-asana-reference-'))
		root = join(base, 'repo')
		home = join(base, 'home')
		plugin = join(base, 'plugin')
		await mkdir(join(root, '.git'), { recursive: true })
		await mkdir(home, { recursive: true })
		await writeText(join(plugin, 'package.json'), '{"name":"cyber-asana"}')
		await writeText(join(plugin, 'references', FILE), '---\ndescription: shipped\nkey: shipped\n---\n\n## Body\n')
	})

	afterEach(async () => {
		await rm(base, { recursive: true, force: true })
	})

	it('passes the composed frontmatter of the shipped copy to parse', async () => {
		expect(await load(identity)).toEqual({ description: 'shipped', key: 'shipped' })
	})

	it('returns what parse returns', async () => {
		expect(await load((metadata) => String(metadata.key).toUpperCase())).toBe('SHIPPED')
	})

	it('returns undefined and never calls parse when no tier ships the name', async () => {
		let called = false
		expect(
			await load(() => {
				called = true
			}, 'cyber-asana.nothing'),
		).toBeUndefined()
		expect(called).toBe(false)
	})

	it('lets a repo copy win a key over the shipped copy', async () => {
		await writeText(join(root, '.agents', 'references', FILE), '---\nkey: repo\n---\n')
		expect(await load(identity)).toMatchObject({ description: 'shipped', key: 'repo' })
	})

	it('lets an error parse throws reach the caller', async () => {
		await expect(
			load(() => {
				throw new Error('bad key')
			}),
		).rejects.toThrow('bad key')
	})

	// §5.1 of docs/design/scrum-system.md asks this of cyber-agentkit: a project section's
	// frontmatter is delivered beside the main document, never composed into its metadata.
	it('does not compose a project section frontmatter into the metadata', async () => {
		await writeText(join(root, 'pkg', 'package.json'), '{}')
		await writeText(join(root, 'pkg', '.agents', 'references', FILE), '---\nkey: section\nextra: 1\n---\n\n## Body\n')
		expect(await load(identity)).toEqual({ description: 'shipped', key: 'shipped' })
		expect(
			await loadReferenceMetadata(NAME, identity, {
				root,
				cwd: join(root, 'pkg'),
				home,
				platform: 'linux',
				env: {},
				packageRoot: plugin,
			}),
		).toEqual({ description: 'shipped', key: 'shipped' })
	})

	it('stops with reference-ambiguous, listing the options, when another plugin also ships the name', async () => {
		await installOtherPlugin()
		const error = await load(identity).catch((e: unknown) => e)
		expect(error).toBeInstanceOf(ReferenceAmbiguousError)
		expect(isReferenceAmbiguousError(error)).toBe(true)
		const ambiguous = error as ReferenceAmbiguousError
		expect(ambiguous.code).toBe(REFERENCE_AMBIGUOUS)
		expect(ambiguous.reference).toBe(NAME)
		expect(ambiguous.options).toEqual(expect.arrayContaining([`cyber-asana/${NAME}`, `other-plugin/${NAME}`]))
		expect(ambiguous.message).toContain(NAME)
		expect(ambiguous.hint).toContain(`reference customize ${NAME} --extends`)
	})

	it('treats another installed copy of cyber-asana as itself, not as a second plugin', async () => {
		await writeText(join(root, 'package.json'), '{"dependencies":{"cyber-asana":"1.0.0"}}')
		const copy = join(root, 'node_modules', 'cyber-asana')
		await writeText(join(copy, 'package.json'), '{"name":"cyber-asana","version":"1.0.0"}')
		await writeText(join(copy, 'plugin.json'), '{"name":"cyber-asana"}')
		await writeText(join(copy, 'references', FILE), '---\nkey: stale\n---\n')
		expect(await load(identity)).toMatchObject({ key: 'shipped' })
	})

	it('resolves once a repo selection picks one of the options', async () => {
		await installOtherPlugin()
		await writeText(join(root, '.agents', 'references', FILE), '---\nextends: [other-plugin]\n---\n')
		expect(await load(identity)).toMatchObject({ key: 'other' })
	})
})

describe('ReferenceAmbiguousError', () => {
	it('becomes a structured config error body with its code and options', () => {
		const body = buildErrorBody(new ReferenceAmbiguousError(NAME, ['a/x', 'b/x']))
		expect(body).toEqual({
			ok: false,
			error: {
				kind: 'config',
				code: REFERENCE_AMBIGUOUS,
				message: expect.stringContaining(NAME),
				options: ['a/x', 'b/x'],
				hint: expect.stringContaining(`reference customize ${NAME} --extends`),
			},
		})
	})
})
