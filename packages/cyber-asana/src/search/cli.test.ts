import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const searchObjectsMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		searchObjects: searchObjectsMock,
	}
})

const { searchCommand } = await import('./cli.js')

/** Commander writes usage errors to stderr per-command; silence the whole subtree. */
function quietProgram() {
	const search = searchCommand()
	const program = new Command().addCommand(search)
	for (const cmd of [program, search, ...search.commands]) {
		cmd.exitOverride()
		cmd.configureOutput({ writeErr: () => {} })
	}
	return program
}

describe('search/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('search objects forwards workspace gid, resource type, query, and count', async () => {
		searchObjectsMock.mockResolvedValue([{ gid: 'proj1', name: 'Website Redesign', resource_type: 'project' }])
		const program = new Command().addCommand(searchCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'search',
				'objects',
				'project',
				'website',
				'--workspace-gid',
				'ws1',
				'--count',
				'5',
				'--opt-fields',
				'gid,name',
			],
			{ from: 'node' },
		)

		expect(searchObjectsMock).toHaveBeenCalledWith('ws1', 'project', {
			query: 'website',
			count: 5,
			optFields: 'gid,name',
		})
	})

	it('search objects applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		searchObjectsMock.mockResolvedValue([{ gid: 'proj1', name: 'Website Redesign', resource_type: 'project' }])
		const program = new Command().addCommand(searchCommand())

		await program.parseAsync(['node', 'test', 'search', 'objects', 'project', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(searchObjectsMock).toHaveBeenCalledWith('ws1', 'project', {
			query: undefined,
			count: undefined,
			optFields: 'gid,name,resource_type',
		})
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 result(s)')
		expect(lines.some((l) => l.includes('not exhaustive'))).toBe(true)
		logSpy.mockRestore()
	})

	it('search objects names the resource type in its empty state', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		searchObjectsMock.mockResolvedValue([])
		const program = new Command().addCommand(searchCommand())

		await program.parseAsync(['node', 'test', 'search', 'objects', 'task', 'nope', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('0 task results found')
		logSpy.mockRestore()
	})

	it('search objects rejects a resource type the endpoint does not accept', async () => {
		const program = quietProgram()

		await expect(
			program.parseAsync(['node', 'test', 'search', 'objects', 'workspace', '--workspace-gid', 'ws1'], {
				from: 'node',
			}),
		).rejects.toThrow()
		expect(searchObjectsMock).not.toHaveBeenCalled()
	})

	it('search objects rejects a count outside 1-100', async () => {
		const program = quietProgram()

		await expect(
			program.parseAsync(['node', 'test', 'search', 'objects', 'task', '--workspace-gid', 'ws1', '--count', '101'], {
				from: 'node',
			}),
		).rejects.toThrow()
		expect(searchObjectsMock).not.toHaveBeenCalled()
	})

	it('search objects requires a workspace gid', async () => {
		const previous = {
			ASANA_WORKSPACE: process.env.ASANA_WORKSPACE,
			ASANA_WORKSPACE_GID: process.env.ASANA_WORKSPACE_GID,
		}
		delete process.env.ASANA_WORKSPACE
		delete process.env.ASANA_WORKSPACE_GID
		const program = new Command().addCommand(searchCommand())

		try {
			await expect(program.parseAsync(['node', 'test', 'search', 'objects', 'task'], { from: 'node' })).rejects.toThrow(
				'Workspace GID is required',
			)
		} finally {
			for (const [key, value] of Object.entries(previous)) {
				if (value === undefined) delete process.env[key]
				else process.env[key] = value
			}
		}
		expect(searchObjectsMock).not.toHaveBeenCalled()
	})

	it('search command can use injected dependencies', async () => {
		const injectedSearchObjects = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(searchCommand({ searchObjects: injectedSearchObjects }))

		await program.parseAsync(['node', 'test', 'search', 'objects', 'team', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(injectedSearchObjects).toHaveBeenCalled()
	})
})
