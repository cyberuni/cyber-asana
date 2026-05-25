import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const getProjectMock = vi.fn()

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
})
