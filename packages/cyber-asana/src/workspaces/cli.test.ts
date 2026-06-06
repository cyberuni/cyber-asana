import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listWorkspacesMock = vi.fn()
const getWorkspaceMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listWorkspaces: listWorkspacesMock,
		getWorkspace: getWorkspaceMock,
	}
})

const { workspaceCommand } = await import('./cli.js')

describe('workspaces/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('workspace list forwards pagination options', async () => {
		listWorkspacesMock.mockResolvedValue({ data: [{ gid: 'ws1', name: 'Acme' }], next_page: null, limit: 100 })
		const program = new Command().addCommand(workspaceCommand())

		await program.parseAsync(['node', 'test', 'workspace', 'list', '--limit', '50', '--opt-fields', 'gid,name'], {
			from: 'node',
		})

		expect(listWorkspacesMock).toHaveBeenCalledWith({
			limit: 50,
			optFields: 'gid,name',
		})
	})

	it('workspace get forwards gid', async () => {
		getWorkspaceMock.mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const program = new Command().addCommand(workspaceCommand())

		await program.parseAsync(['node', 'test', 'workspace', 'get', 'ws1'], { from: 'node' })

		expect(getWorkspaceMock).toHaveBeenCalledWith('ws1')
	})

	it('workspace command can use injected dependencies', async () => {
		const injectedGetWorkspace = vi.fn().mockResolvedValue({ gid: 'ws1', name: 'Acme' })
		const program = new Command().addCommand(
			workspaceCommand({
				listWorkspaces: vi.fn(),
				getWorkspace: injectedGetWorkspace,
			}),
		)

		await program.parseAsync(['node', 'test', 'workspace', 'get', 'ws1'], { from: 'node' })

		expect(injectedGetWorkspace).toHaveBeenCalledWith('ws1')
	})
})
