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
