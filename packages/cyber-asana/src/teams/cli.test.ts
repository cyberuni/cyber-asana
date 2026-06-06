import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listTeamsMock = vi.fn()
const getTeamMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listTeams: listTeamsMock,
		getTeam: getTeamMock,
	}
})

const { teamCommand } = await import('./cli.js')

describe('teams/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('team list forwards workspace gid and pagination options', async () => {
		listTeamsMock.mockResolvedValue({ data: [{ gid: 'team1', name: 'Engineering' }], next_page: null, limit: 100 })
		const program = new Command().addCommand(teamCommand())

		await program.parseAsync(
			['node', 'test', 'team', 'list', '--workspace-gid', 'ws1', '--limit', '50', '--opt-fields', 'gid,name'],
			{ from: 'node' },
		)

		expect(listTeamsMock).toHaveBeenCalledWith('ws1', {
			limit: 50,
			optFields: 'gid,name',
		})
	})

	it('team get forwards gid', async () => {
		getTeamMock.mockResolvedValue({ gid: 'team1', name: 'Engineering' })
		const program = new Command().addCommand(teamCommand())

		await program.parseAsync(['node', 'test', 'team', 'get', 'team1'], { from: 'node' })

		expect(getTeamMock).toHaveBeenCalledWith('team1')
	})

	it('team command can use injected dependencies', async () => {
		const injectedGetTeam = vi.fn().mockResolvedValue({ gid: 'team1', name: 'Engineering' })
		const program = new Command().addCommand(
			teamCommand({
				listTeams: vi.fn(),
				getTeam: injectedGetTeam,
			}),
		)

		await program.parseAsync(['node', 'test', 'team', 'get', 'team1'], { from: 'node' })

		expect(injectedGetTeam).toHaveBeenCalledWith('team1')
	})
})
