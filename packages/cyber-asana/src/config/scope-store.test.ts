import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { saveGlobalConfig } from './global-config.js'
import { saveRepoConfig } from './repo-config.js'
import { createFileScopeStore } from './scope-store.js'

describe('createFileScopeStore', () => {
	let root: string
	const repoFile = () => join(root, '.agents', 'cyber-asana.json')
	const globalFile = () => join(root, 'global.json')
	const store = () => createFileScopeStore({ startDir: root })

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-scope-store-'))
		await mkdir(join(root, '.git'))
		await writeFile(join(root, '.git', 'config'), '[remote "origin"]\n\turl = git@github.com:org/repo.git\n')
		process.env.CYBER_ASANA_GLOBAL_CONFIG = globalFile()
	})

	afterEach(async () => {
		delete process.env.CYBER_ASANA_GLOBAL_CONFIG
		await rm(root, { recursive: true, force: true })
	})

	it('lists nothing, with no default project, when no config exists', async () => {
		expect(await store().load()).toMatchObject({ scopes: [], sources: {} })
	})

	it('creates the repo config at schema 3 on the first add', async () => {
		const result = await store().add({ name: 'web', kind: 'project', projects: ['1'] }, 'repo')
		expect(result).toEqual({ path: repoFile(), target: 'repo' })
		expect(JSON.parse(await readFile(repoFile(), 'utf8'))).toEqual({
			schema_version: 3,
			projects: [],
			scrum: { scopes: [{ name: 'web', kind: 'project', projects: ['1'] }] },
		})
	})

	it('adds to the global registry under the repo key, leaving the repo config alone', async () => {
		const result = await store().add({ name: 'mine', kind: 'projects', projects: ['1', '2'] }, 'global')
		expect(result).toEqual({ path: globalFile(), target: 'global' })
		const saved = JSON.parse(await readFile(globalFile(), 'utf8'))
		expect(saved.repos).toEqual([
			{ repo: 'github.com/org/repo', projects: [], scopes: [{ name: 'mine', kind: 'projects', projects: ['1', '2'] }] },
		])
	})

	it('reports where each scope came from and the default project', async () => {
		await saveRepoConfig(repoFile(), {
			schema_version: 3,
			projects: [{ gid: '1201', name: 'Web', aliases: [], default: true }],
			scrum: { scopes: [{ name: 'web', kind: 'project', projects: ['1201'] }] },
		})
		await saveGlobalConfig(globalFile(), {
			schema_version: 1,
			repos: [
				{
					repo: 'github.com/org/repo',
					projects: [],
					scopes: [{ name: 'mine', kind: 'projects', projects: ['1', '2'] }],
				},
			],
		})
		const loaded = await store().load()
		expect(loaded.scopes.map((s) => s.name)).toEqual(['web', 'mine'])
		expect(loaded.sources).toEqual({ web: 'repo', mine: 'global' })
		expect(loaded.defaultProject).toEqual({ gid: '1201', name: 'Web' })
	})

	it('removes a scope from the repo config when it is there, else from the global registry', async () => {
		await store().add({ name: 'web', kind: 'project', projects: ['1'] }, 'repo')
		await store().add({ name: 'mine', kind: 'project', projects: ['2'] }, 'global')
		expect((await store().remove('web')).target).toBe('repo')
		expect((await store().remove('mine')).target).toBe('global')
		expect((await store().load()).scopes).toEqual([])
	})

	it('throws, naming the known scopes, when removing one that is not configured', async () => {
		await store().add({ name: 'web', kind: 'project', projects: ['1'] }, 'repo')
		await expect(store().remove('nope')).rejects.toThrow('Scope "nope" is not configured; known scopes: web')
	})

	it('refuses a global add when the repo cannot be keyed', async () => {
		const orphan = await mkdtemp(join(tmpdir(), 'cyber-asana-orphan-'))
		try {
			await expect(
				createFileScopeStore({ startDir: orphan }).add({ name: 'a', kind: 'project', projects: ['1'] }, 'global'),
			).rejects.toThrow('--repo')
		} finally {
			await rm(orphan, { recursive: true, force: true })
		}
	})

	it('honors an explicit config path and repo key', async () => {
		const custom = join(root, 'elsewhere.json')
		await createFileScopeStore({ startDir: root, configPath: custom }).add(
			{ name: 'x', kind: 'project', projects: ['1'] },
			'repo',
		)
		expect(JSON.parse(await readFile(custom, 'utf8')).scrum.scopes).toHaveLength(1)
		await createFileScopeStore({ startDir: root, repo: 'custom' }).add(
			{ name: 'y', kind: 'project', projects: ['1'] },
			'global',
		)
		expect(JSON.parse(await readFile(globalFile(), 'utf8')).repos[0].repo).toBe('custom')
	})
})
