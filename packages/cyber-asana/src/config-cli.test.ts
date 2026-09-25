import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getProjectMock = vi.fn()
const getUserMock = vi.fn()
const searchObjectsMock = vi.fn()

async function loadConfigCommand() {
	vi.resetModules()
	const mod = await import('./config-cli.js')
	return mod.configCommand
}

describe('config/cli', () => {
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	let root: string | undefined
	const originalArgv = [...process.argv]

	afterEach(async () => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
		if (root) {
			await rm(root, { recursive: true, force: true })
			root = undefined
		}
	})

	it('resolve-project performs local lookup without calling getProject', async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-config-cli-'))
		await mkdir(join(root, '.git'))
		await mkdir(join(root, '.agents'))
		const configPath = join(root, '.agents', 'cyber-asana.json')
		await writeFile(
			configPath,
			JSON.stringify({
				schema_version: 1,
				projects: [{ gid: '111', name: 'Backend' }],
			}),
		)

		const configCommand = await loadConfigCommand()
		const program = new Command().addCommand(
			configCommand(
				() =>
					({
						getProject: getProjectMock,
					}) as never,
			),
		)

		process.argv = ['node', 'test', '--json']
		await program.parseAsync(['node', 'test', 'config', 'resolve-project', 'backend', '--config', configPath], {
			from: 'node',
		})

		expect(getProjectMock).not.toHaveBeenCalled()
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "111"'))
	})

	it('list shows repo config projects', async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-config-cli-list-'))
		await mkdir(join(root, '.agents'))
		const configPath = join(root, 'config.json')
		await writeFile(
			configPath,
			JSON.stringify({
				schema_version: 1,
				projects: [{ gid: '999', name: 'My Project' }],
			}),
		)

		const configCommand = await loadConfigCommand()
		const program = new Command().addCommand(
			configCommand(
				() =>
					({
						getProject: getProjectMock,
					}) as never,
			),
		)

		process.argv = ['node', 'test', '--json']
		await program.parseAsync(['node', 'test', 'config', 'list', '--config', configPath], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "999"'))
	})

	it('sync refreshes names via getProject', async () => {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-config-cli-sync-'))
		const configPath = join(root, 'config.json')
		await writeFile(
			configPath,
			JSON.stringify({
				schema_version: 1,
				projects: [{ gid: '111', name: 'Old Name' }],
			}),
		)
		getProjectMock.mockResolvedValue({ gid: '111', name: 'New Name' })

		const configCommand = await loadConfigCommand()
		const program = new Command().addCommand(
			configCommand(
				() =>
					({
						getProject: getProjectMock,
					}) as never,
			),
		)

		process.argv = ['node', 'test', '--json']
		await program.parseAsync(['node', 'test', 'config', 'sync', '--config', configPath], { from: 'node' })

		expect(getProjectMock).toHaveBeenCalledWith('111')
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"updated": 1'))
	})

	async function userProgram() {
		const configCommand = await loadConfigCommand()
		return new Command().addCommand(
			configCommand(
				() => ({ getProject: getProjectMock }) as never,
				() => ({ getUser: getUserMock }) as never,
				() => ({ searchObjects: searchObjectsMock }) as never,
			),
		)
	}

	async function writeConfig(config: unknown) {
		root = await mkdtemp(join(tmpdir(), 'cyber-asana-config-cli-users-'))
		const configPath = join(root, 'config.json')
		await writeFile(configPath, JSON.stringify(config))
		return configPath
	}

	it('add-user fetches name and email and stores the aliases', async () => {
		const configPath = await writeConfig({ schema_version: 1, projects: [] })
		getUserMock.mockResolvedValue({ gid: '100', name: 'Alice Anderson', email: 'alice@example.com' })

		process.argv = ['node', 'test', '--json']
		await (await userProgram()).parseAsync(
			['node', 'test', 'config', 'add-user', '100', '--alias', 'ali', '--alias', 'aa', '--config', configPath],
			{ from: 'node' },
		)

		expect(getUserMock).toHaveBeenCalledWith('100')
		expect(JSON.parse(await readFile(configPath, 'utf8')).users).toEqual([
			{ gid: '100', name: 'Alice Anderson', email: 'alice@example.com', aliases: ['ali', 'aa'] },
		])
	})

	it('add-user splits a comma-separated --alias into several aliases', async () => {
		const configPath = await writeConfig({ schema_version: 1, projects: [] })
		getUserMock.mockResolvedValue({ gid: '100', name: 'Alice Anderson', email: 'alice@example.com' })

		process.argv = ['node', 'test', '--json']
		await (await userProgram()).parseAsync(
			['node', 'test', 'config', 'add-user', '100', '--alias', 'ali, aa,', '--alias', 'al', '--config', configPath],
			{ from: 'node' },
		)

		expect(JSON.parse(await readFile(configPath, 'utf8')).users[0].aliases).toEqual(['ali', 'aa', 'al'])
	})

	it('resolve-user looks up an alias without calling getUser', async () => {
		const configPath = await writeConfig({
			schema_version: 1,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', email: 'alice@example.com', aliases: ['ali'] }],
		})

		process.argv = ['node', 'test', '--json']
		await (await userProgram()).parseAsync(['node', 'test', 'config', 'resolve-user', 'ali', '--config', configPath], {
			from: 'node',
		})

		expect(getUserMock).not.toHaveBeenCalled()
		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "100"'))
	})

	it('resolve-user reports an unknown user', async () => {
		const configPath = await writeConfig({ schema_version: 1, projects: [], users: [] })

		await expect(
			(await userProgram()).parseAsync(['node', 'test', 'config', 'resolve-user', 'carol', '--config', configPath], {
				from: 'node',
			}),
		).rejects.toThrow('User not found in repo config: carol')
	})

	it('list-users shows registered users', async () => {
		const configPath = await writeConfig({
			schema_version: 1,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
		})

		process.argv = ['node', 'test', '--json']
		await (await userProgram()).parseAsync(['node', 'test', 'config', 'list-users', '--config', configPath], {
			from: 'node',
		})

		expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"name": "Alice Anderson"'))
	})

	it('remove-user removes the user an alias resolves to', async () => {
		const configPath = await writeConfig({
			schema_version: 1,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
		})

		process.argv = ['node', 'test', '--json']
		await (await userProgram()).parseAsync(['node', 'test', 'config', 'remove-user', 'ali', '--config', configPath], {
			from: 'node',
		})

		expect(JSON.parse(await readFile(configPath, 'utf8')).users).toEqual([])
	})

	it('remove-alias drops aliases, repeated or comma-separated, without calling getUser', async () => {
		const configPath = await writeConfig({
			schema_version: 1,
			projects: [],
			users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali', 'al', 'aa', 'a'] }],
		})

		process.argv = ['node', 'test', '--json']
		await (await userProgram()).parseAsync(
			['node', 'test', 'config', 'remove-alias', 'al,aa', 'A', '--config', configPath],
			{ from: 'node' },
		)

		expect(getUserMock).not.toHaveBeenCalled()
		expect(JSON.parse(await readFile(configPath, 'utf8')).users[0].aliases).toEqual(['ali'])
	})

	it('sync refreshes user names and emails via getUser', async () => {
		const configPath = await writeConfig({
			schema_version: 1,
			projects: [],
			users: [{ gid: '100', name: 'Old', email: 'old@example.com', aliases: ['ali'] }],
		})
		getUserMock.mockResolvedValue({ gid: '100', name: 'New', email: 'new@example.com' })

		process.argv = ['node', 'test', '--json']
		await (await userProgram()).parseAsync(['node', 'test', 'config', 'sync', '--config', configPath], {
			from: 'node',
		})

		expect(JSON.parse(await readFile(configPath, 'utf8')).users).toEqual([
			{ gid: '100', name: 'New', email: 'new@example.com', aliases: ['ali'] },
		])
	})

	describe('--global and --merged', () => {
		let globalRoot: string | undefined
		const prevGlobalOverride = process.env.CYBER_ASANA_GLOBAL_CONFIG

		afterEach(async () => {
			if (prevGlobalOverride === undefined) delete process.env.CYBER_ASANA_GLOBAL_CONFIG
			else process.env.CYBER_ASANA_GLOBAL_CONFIG = prevGlobalOverride
			if (globalRoot) {
				await rm(globalRoot, { recursive: true, force: true })
				globalRoot = undefined
			}
		})

		async function writeGlobalConfig(config: unknown) {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-cli-'))
			const path = join(globalRoot, 'global.json')
			await writeFile(path, JSON.stringify(config))
			process.env.CYBER_ASANA_GLOBAL_CONFIG = path
			return path
		}

		async function program() {
			const configCommand = await loadConfigCommand()
			return new Command().addCommand(configCommand(() => ({ getProject: getProjectMock }) as never))
		}

		it('add --global creates the file and writes under the given --repo', async () => {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-cli-'))
			const path = join(globalRoot, 'global.json')
			process.env.CYBER_ASANA_GLOBAL_CONFIG = path
			getProjectMock.mockResolvedValue({ gid: '111', name: 'Backend' })

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(['node', 'test', 'config', 'add', '111', '--global', '--repo', 'repo-a'], {
				from: 'node',
			})

			expect(JSON.parse(await readFile(path, 'utf8')).repos).toEqual([
				{ repo: 'repo-a', projects: [{ gid: '111', name: 'Backend', aliases: [] }] },
			])
		})

		it('show --global lists only the matching repo entry', async () => {
			await writeGlobalConfig({
				schema_version: 1,
				repos: [
					{ repo: 'repo-a', projects: [{ gid: '1', name: 'A' }] },
					{ repo: 'repo-b', projects: [{ gid: '2', name: 'B' }] },
				],
			})

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(['node', 'test', 'config', 'show', '--global', '--repo', 'repo-a'], {
				from: 'node',
			})

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "1"'))
			expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('"gid": "2"'))
		})

		it('show --global errors when the global file does not exist', async () => {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-cli-'))
			process.env.CYBER_ASANA_GLOBAL_CONFIG = join(globalRoot, 'missing.json')

			await expect(
				(await program()).parseAsync(['node', 'test', 'config', 'show', '--global', '--repo', 'repo-a'], {
					from: 'node',
				}),
			).rejects.toThrow('Global config not found')
		})

		it('remove --global deletes the matching entry, scoped to the repo', async () => {
			const path = await writeGlobalConfig({
				schema_version: 1,
				repos: [
					{
						repo: 'repo-a',
						projects: [
							{ gid: '1', name: 'A' },
							{ gid: '2', name: 'B' },
						],
					},
				],
			})

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(['node', 'test', 'config', 'remove', '1', '--global', '--repo', 'repo-a'], {
				from: 'node',
			})

			expect(JSON.parse(await readFile(path, 'utf8')).repos).toEqual([
				{ repo: 'repo-a', projects: [{ gid: '2', name: 'B', aliases: [] }] },
			])
		})

		it('remove --global reports an argument that matches no entry for that repo', async () => {
			await writeGlobalConfig({
				schema_version: 1,
				repos: [{ repo: 'repo-a', projects: [{ gid: '1', name: 'A' }] }],
			})

			await expect(
				(await program()).parseAsync(['node', 'test', 'config', 'remove', 'Missing', '--global', '--repo', 'repo-a'], {
					from: 'node',
				}),
			).rejects.toThrow('Project not found in global config: Missing')
		})

		it('path --global prints the resolved global file path', async () => {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-cli-'))
			const path = join(globalRoot, 'global.json')
			process.env.CYBER_ASANA_GLOBAL_CONFIG = path

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(['node', 'test', 'config', 'path', '--global'], { from: 'node' })

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(path))
		})

		it('resolve-project --global resolves without calling getProject', async () => {
			await writeGlobalConfig({
				schema_version: 1,
				repos: [{ repo: 'repo-a', projects: [{ gid: '1', name: 'Backend' }] }],
			})

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(
				['node', 'test', 'config', 'resolve-project', 'backend', '--global', '--repo', 'repo-a'],
				{ from: 'node' },
			)

			expect(getProjectMock).not.toHaveBeenCalled()
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "1"'))
		})

		it('sync --global refreshes names across every repo in the file', async () => {
			const path = await writeGlobalConfig({
				schema_version: 1,
				repos: [
					{ repo: 'repo-a', projects: [{ gid: '1', name: 'Old A' }] },
					{ repo: 'repo-b', projects: [{ gid: '2', name: 'Old B' }] },
				],
			})
			getProjectMock.mockImplementation(async (gid: string) =>
				gid === '1' ? { gid: '1', name: 'New A' } : { gid: '2', name: 'New B' },
			)

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(['node', 'test', 'config', 'sync', '--global'], { from: 'node' })

			const saved = JSON.parse(await readFile(path, 'utf8'))
			expect(saved.repos[0].projects[0].name).toBe('New A')
			expect(saved.repos[1].projects[0].name).toBe('New B')
		})

		it('sync --global without a global file anywhere is an error', async () => {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-cli-'))
			process.env.CYBER_ASANA_GLOBAL_CONFIG = join(globalRoot, 'missing.json')

			await expect(
				(await program()).parseAsync(['node', 'test', 'config', 'sync', '--global'], { from: 'node' }),
			).rejects.toThrow('Global config not found')
		})

		it('--global and --merged together is a usage error', async () => {
			await expect(
				(await program()).parseAsync(['node', 'test', 'config', 'show', '--global', '--merged'], { from: 'node' }),
			).rejects.toThrow(/not both/)
		})

		it('show --merged unions the repo config and the global entry, local winning a gid collision', async () => {
			root = await mkdtemp(join(tmpdir(), 'cyber-asana-merged-cli-'))
			const configPath = join(root, 'config.json')
			await writeFile(configPath, JSON.stringify({ schema_version: 1, projects: [{ gid: '1', name: 'Local Name' }] }))
			await writeGlobalConfig({
				schema_version: 1,
				repos: [
					{
						repo: 'repo-a',
						projects: [
							{ gid: '1', name: 'Global Name' },
							{ gid: '2', name: 'Global Only' },
						],
					},
				],
			})

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(
				['node', 'test', 'config', 'show', '--merged', '--config', configPath, '--repo', 'repo-a'],
				{ from: 'node' },
			)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"name": "Local Name"'))
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "2"'))
			expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Global Name'))
		})

		it('resolve-project --merged resolves a name present only in the global entry', async () => {
			root = await mkdtemp(join(tmpdir(), 'cyber-asana-merged-resolve-'))
			const configPath = join(root, 'config.json')
			await writeFile(configPath, JSON.stringify({ schema_version: 1, projects: [{ gid: '1', name: 'Local Name' }] }))
			await writeGlobalConfig({
				schema_version: 1,
				repos: [{ repo: 'repo-a', projects: [{ gid: '2', name: 'Global Only' }] }],
			})

			process.argv = ['node', 'test', '--json']
			await (await program()).parseAsync(
				[
					'node',
					'test',
					'config',
					'resolve-project',
					'Global Only',
					'--merged',
					'--config',
					configPath,
					'--repo',
					'repo-a',
				],
				{ from: 'node' },
			)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "2"'))
		})

		it('show --merged errors when neither source has anything', async () => {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-cli-'))
			process.env.CYBER_ASANA_GLOBAL_CONFIG = join(globalRoot, 'missing.json')
			root = await mkdtemp(join(tmpdir(), 'cyber-asana-merged-missing-'))
			const configPath = join(root, 'missing-config.json')

			await expect(
				(await program()).parseAsync(
					['node', 'test', 'config', 'show', '--merged', '--config', configPath, '--repo', 'repo-a'],
					{ from: 'node' },
				),
			).rejects.toThrow('No repo or global config found')
		})
	})

	describe('global and merged user registry', () => {
		let globalRoot: string | undefined
		const prevGlobalOverride = process.env.CYBER_ASANA_GLOBAL_CONFIG

		afterEach(async () => {
			if (prevGlobalOverride === undefined) delete process.env.CYBER_ASANA_GLOBAL_CONFIG
			else process.env.CYBER_ASANA_GLOBAL_CONFIG = prevGlobalOverride
			if (globalRoot) {
				await rm(globalRoot, { recursive: true, force: true })
				globalRoot = undefined
			}
		})

		async function writeGlobalConfig(config: unknown) {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-users-cli-'))
			const path = join(globalRoot, 'global.json')
			await writeFile(path, JSON.stringify(config))
			process.env.CYBER_ASANA_GLOBAL_CONFIG = path
			return path
		}

		async function userProgram() {
			const configCommand = await loadConfigCommand()
			return new Command().addCommand(
				configCommand(
					() => ({ getProject: getProjectMock }) as never,
					() => ({ getUser: getUserMock }) as never,
				),
			)
		}

		it('add-user --global creates the global file and never accepts --repo', async () => {
			globalRoot = await mkdtemp(join(tmpdir(), 'cyber-asana-global-users-cli-'))
			const path = join(globalRoot, 'global.json')
			process.env.CYBER_ASANA_GLOBAL_CONFIG = path
			getUserMock.mockResolvedValue({ gid: '100', name: 'Alice Anderson', email: 'alice@example.com' })

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(
				['node', 'test', 'config', 'add-user', '100', '--global', '--alias', 'ali'],
				{ from: 'node' },
			)

			expect(JSON.parse(await readFile(path, 'utf8')).users).toEqual([
				{ gid: '100', name: 'Alice Anderson', email: 'alice@example.com', aliases: ['ali'] },
			])
		})

		it('resolve-user --global resolves without calling getUser', async () => {
			await writeGlobalConfig({
				schema_version: 1,
				repos: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
			})

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(['node', 'test', 'config', 'resolve-user', 'ali', '--global'], {
				from: 'node',
			})

			expect(getUserMock).not.toHaveBeenCalled()
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "100"'))
		})

		it('resolve-user --global reports an unknown query', async () => {
			await writeGlobalConfig({ schema_version: 1, repos: [], users: [] })

			await expect(
				(await userProgram()).parseAsync(['node', 'test', 'config', 'resolve-user', 'carol', '--global'], {
					from: 'node',
				}),
			).rejects.toThrow('User not found in global config: carol')
		})

		it('list-users --global lists the flat global user list', async () => {
			await writeGlobalConfig({
				schema_version: 1,
				repos: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
			})

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(['node', 'test', 'config', 'list-users', '--global'], { from: 'node' })

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"name": "Alice Anderson"'))
		})

		it('remove-alias --global drops the alias and keeps the user', async () => {
			const path = await writeGlobalConfig({
				schema_version: 1,
				repos: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali', 'aa'] }],
			})

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(['node', 'test', 'config', 'remove-alias', 'aa', '--global'], {
				from: 'node',
			})

			expect(JSON.parse(await readFile(path, 'utf8')).users[0].aliases).toEqual(['ali'])
		})

		it('remove-user --global removes the resolved user', async () => {
			const path = await writeGlobalConfig({
				schema_version: 1,
				repos: [],
				users: [{ gid: '100', name: 'Alice Anderson', aliases: ['ali'] }],
			})

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(['node', 'test', 'config', 'remove-user', 'ali', '--global'], {
				from: 'node',
			})

			expect(JSON.parse(await readFile(path, 'utf8')).users).toEqual([])
		})

		it('sync --global refreshes global users regardless of a non-matching --repo project filter', async () => {
			const path = await writeGlobalConfig({
				schema_version: 1,
				repos: [{ repo: 'repo-a', projects: [{ gid: '1', name: 'Old Project' }] }],
				users: [{ gid: '100', name: 'Old Name', aliases: ['ali'] }],
			})
			getProjectMock.mockResolvedValue({ gid: '1', name: 'New Project' })
			getUserMock.mockResolvedValue({ gid: '100', name: 'New Name', email: 'alice@example.com' })

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(['node', 'test', 'config', 'sync', '--global', '--repo', 'repo-b'], {
				from: 'node',
			})

			const saved = JSON.parse(await readFile(path, 'utf8'))
			expect(saved.repos[0].projects[0].name).toBe('Old Project')
			expect(saved.users[0].name).toBe('New Name')
		})

		it('list-users --merged unions the repo config and global users, local winning a gid collision', async () => {
			root = await mkdtemp(join(tmpdir(), 'cyber-asana-merged-users-cli-'))
			const configPath = join(root, 'config.json')
			await writeFile(
				configPath,
				JSON.stringify({
					schema_version: 1,
					projects: [],
					users: [{ gid: '100', name: 'Local Alice', aliases: ['ali'] }],
				}),
			)
			await writeGlobalConfig({
				schema_version: 1,
				repos: [],
				users: [
					{ gid: '100', name: 'Global Alice', aliases: ['al'] },
					{ gid: '200', name: 'Bob Brown', aliases: ['bobby'] },
				],
			})

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(
				['node', 'test', 'config', 'list-users', '--merged', '--config', configPath],
				{ from: 'node' },
			)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"name": "Local Alice"'))
			expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('Global Alice'))
			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"name": "Bob Brown"'))
		})

		it('resolve-user --merged falls back to the global registry when the repo config has no match', async () => {
			root = await mkdtemp(join(tmpdir(), 'cyber-asana-merged-users-resolve-'))
			const configPath = join(root, 'config.json')
			await writeFile(
				configPath,
				JSON.stringify({
					schema_version: 1,
					projects: [],
					users: [{ gid: '100', name: 'Local Alice', aliases: ['ali'] }],
				}),
			)
			await writeGlobalConfig({
				schema_version: 1,
				repos: [],
				users: [{ gid: '200', name: 'Bob Brown', aliases: ['bobby'] }],
			})

			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(
				['node', 'test', 'config', 'resolve-user', 'bobby', '--merged', '--config', configPath],
				{ from: 'node' },
			)

			expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"gid": "200"'))
		})
	})

	describe('add-user --search', () => {
		const ada = { gid: '100', name: 'Ada Lovelace', email: 'ada@example.com' }
		const adam = { gid: '200', name: 'Adam Smith', email: 'adam@example.com' }

		async function addBySearch(configPath: string, ...args: string[]) {
			process.argv = ['node', 'test', '--json']
			await (await userProgram()).parseAsync(
				['node', 'test', 'config', 'add-user', ...args, '--workspace-gid', 'ws1', '--config', configPath],
				{ from: 'node' },
			)
		}

		it('registers the single typeahead match', async () => {
			const configPath = await writeConfig({ schema_version: 1, projects: [] })
			searchObjectsMock.mockResolvedValue([ada])
			getUserMock.mockResolvedValue(ada)

			await addBySearch(configPath, '--search', 'lovelace', '--alias', 'ada')

			expect(searchObjectsMock).toHaveBeenCalledWith('ws1', 'user', expect.objectContaining({ query: 'lovelace' }))
			expect(getUserMock).toHaveBeenCalledWith('100')
			expect(JSON.parse(await readFile(configPath, 'utf8')).users).toEqual([{ ...ada, aliases: ['ada'] }])
		})

		it('picks the one exact name or email match among several hits', async () => {
			const configPath = await writeConfig({ schema_version: 1, projects: [] })
			searchObjectsMock.mockResolvedValue([adam, ada])
			getUserMock.mockResolvedValue(ada)

			await addBySearch(configPath, '--search', 'ADA@example.com')

			expect(getUserMock).toHaveBeenCalledWith('100')
		})

		it('refuses to guess between several hits and lists them', async () => {
			const configPath = await writeConfig({ schema_version: 1, projects: [] })
			searchObjectsMock.mockResolvedValue([ada, adam])

			await expect(addBySearch(configPath, '--search', 'ad')).rejects.toThrow(
				/"ad" matches 2 users.*100 \(Ada Lovelace, ada@example.com\).*200 \(Adam Smith, adam@example.com\).*config add-user <user-gid>/s,
			)
			expect(getUserMock).not.toHaveBeenCalled()
			expect(JSON.parse(await readFile(configPath, 'utf8')).users).toBeUndefined()
		})

		it('reports when nobody matches', async () => {
			const configPath = await writeConfig({ schema_version: 1, projects: [] })
			searchObjectsMock.mockResolvedValue([])

			await expect(addBySearch(configPath, '--search', 'zed')).rejects.toThrow('No user matches "zed"')
		})

		it('requires either a user GID or --search, not both', async () => {
			const configPath = await writeConfig({ schema_version: 1, projects: [] })

			await expect(addBySearch(configPath)).rejects.toThrow('Pass a <user-gid> or --search <query>')
			await expect(addBySearch(configPath, '100', '--search', 'ada')).rejects.toThrow(
				'Pass a <user-gid> or --search <query>, not both',
			)
		})
	})
})
