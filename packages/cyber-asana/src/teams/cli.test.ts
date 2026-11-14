import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const listTeamsMock = vi.fn()
const getTeamMock = vi.fn()
const listTeamMembersMock = vi.fn()
const listTeamProjectsMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		listTeams: listTeamsMock,
		getTeam: getTeamMock,
		listTeamMembers: listTeamMembersMock,
		listTeamProjects: listTeamProjectsMock,
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

	it('team list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listTeamsMock.mockResolvedValue([{ gid: 'team1', name: 'Engineering' }])
		const program = new Command().addCommand(teamCommand())

		await program.parseAsync(['node', 'test', 'team', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listTeamsMock).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'gid,name' }))
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 team(s)')
		expect(lines.some((l) => l.includes('cyber-asana team get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('team get forwards gid', async () => {
		getTeamMock.mockResolvedValue({ gid: 'team1', name: 'Engineering' })
		const program = new Command().addCommand(teamCommand())

		await program.parseAsync(['node', 'test', 'team', 'get', 'team1'], { from: 'node' })

		expect(getTeamMock).toHaveBeenCalledWith('team1', undefined)
	})

	it('team command can use injected dependencies', async () => {
		const injectedGetTeam = vi.fn().mockResolvedValue({ gid: 'team1', name: 'Engineering' })
		const program = new Command().addCommand(
			teamCommand({
				listTeams: vi.fn(),
				getTeam: injectedGetTeam,
				listTeamMembers: vi.fn(),
				listTeamProjects: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'team', 'get', 'team1'], { from: 'node' })

		expect(injectedGetTeam).toHaveBeenCalledWith('team1', undefined)
	})

	it('team members forwards the team gid and pagination, defaults a minimal field set, and names the count', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listTeamMembersMock.mockResolvedValue([{ gid: 'm1', user: { gid: 'u1', name: 'Ada' } }])
		const program = new Command().addCommand(teamCommand())

		await program.parseAsync(['node', 'test', 'team', 'members', 'team1', '--limit', '20'], { from: 'node' })

		expect(listTeamMembersMock).toHaveBeenCalledWith('team1', { limit: 20, optFields: 'user.gid,user.name' })
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines.some((l) => l.includes('Ada') && l.includes('u1'))).toBe(true)
		expect(lines).toContain('\n1 member(s)')
		logSpy.mockRestore()
	})

	it('team members says what was empty', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listTeamMembersMock.mockResolvedValue([])
		const program = new Command().addCommand(teamCommand())

		await program.parseAsync(['node', 'test', 'team', 'members', 'team1'], { from: 'node' })

		expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('0 team members found')
		logSpy.mockRestore()
	})

	it('team projects forwards the team gid, pagination, and --archived', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		listTeamProjectsMock.mockResolvedValue([{ gid: 'p1', name: 'web' }])
		const program = new Command().addCommand(teamCommand())

		await program.parseAsync(['node', 'test', 'team', 'projects', 'team1', '--archived', '--limit', '10', '--all'], {
			from: 'node',
		})

		expect(listTeamProjectsMock).toHaveBeenCalledWith('team1', {
			limit: 10,
			fetchAll: true,
			archived: true,
			optFields: 'gid,name',
		})
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 project(s)')
		expect(lines.some((l) => l.includes('cyber-asana project get <gid>'))).toBe(true)
		logSpy.mockRestore()
	})
})
