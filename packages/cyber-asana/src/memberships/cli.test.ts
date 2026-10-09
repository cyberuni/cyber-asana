import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MembershipApi } from './api.js'

const createMembershipMock = vi.fn()
const updateMembershipMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		createMembership: createMembershipMock,
		updateMembership: updateMembershipMock,
	}
})

const { membershipCommand } = await import('./cli.js')

function stubApi(overrides: Partial<MembershipApi> = {}): MembershipApi {
	return {
		listMemberships: vi.fn(),
		getMembership: vi.fn(),
		createMembership: vi.fn(),
		updateMembership: vi.fn(),
		deleteMembership: vi.fn(),
		...overrides,
	} as MembershipApi
}

describe('memberships/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		vi.restoreAllMocks()
		process.argv = [...originalArgv]
	})

	it('membership list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listMemberships = vi
			.fn()
			.mockResolvedValue([{ gid: 'm1', member: { gid: 'u1', name: 'Ada' }, access_level: 'editor' }])
		const program = new Command().addCommand(membershipCommand(stubApi({ listMemberships })))

		await program.parseAsync(['node', 'test', 'membership', 'list', '--parent-gid', 'proj1'], { from: 'node' })

		expect(listMemberships).toHaveBeenCalledWith(
			{ parent: 'proj1' },
			expect.objectContaining({ optFields: 'gid,member.name,access_level' }),
		)
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 membership(s)')
		expect(lines.some((l) => l.includes('Ada'))).toBe(true)
		expect(lines.some((l) => l.includes('cyber-asana membership get <gid>'))).toBe(true)
	})

	it('membership list names the entity when nothing comes back', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const program = new Command().addCommand(
			membershipCommand(stubApi({ listMemberships: vi.fn().mockResolvedValue([]) })),
		)

		await program.parseAsync(['node', 'test', 'membership', 'list', '--parent-gid', 'proj1'], { from: 'node' })

		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('0 memberships found')
	})

	it('membership list forwards member and resource-subtype filters', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listMemberships = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(membershipCommand(stubApi({ listMemberships })))

		await program.parseAsync(
			['node', 'test', 'membership', 'list', '--member-gid', 'team1', '--resource-subtype', 'project_membership'],
			{ from: 'node' },
		)

		expect(listMemberships).toHaveBeenCalledWith(
			{ member: 'team1', resource_subtype: 'project_membership' },
			expect.anything(),
		)
	})

	it('membership list rejects a member filter without a parent or resource subtype', async () => {
		const program = new Command().exitOverride().addCommand(membershipCommand(stubApi()).exitOverride())

		await expect(
			program.parseAsync(['node', 'test', 'membership', 'list', '--member-gid', 'u1'], { from: 'node' }),
		).rejects.toThrow(/--parent-gid/)
	})

	it('membership get prints the membership fields', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const getMembership = vi.fn().mockResolvedValue({
			gid: 'm1',
			member: { gid: 'u1', name: 'Ada' },
			parent: { gid: 'proj1', name: 'Website' },
			access_level: 'editor',
		})
		const program = new Command().addCommand(membershipCommand(stubApi({ getMembership })))

		await program.parseAsync(['node', 'test', 'membership', 'get', 'm1'], { from: 'node' })

		expect(getMembership).toHaveBeenCalledWith('m1')
		const logged = logSpy.mock.calls.map((c) => String(c[0])).join('\n')
		expect(logged).toContain('Ada')
		expect(logged).toContain('editor')
	})

	it('membership create forwards parent, member, and access level', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		createMembershipMock.mockResolvedValue({ gid: 'm1', member: { gid: 'u1', name: 'Ada' } })
		const program = new Command().addCommand(membershipCommand())

		await program.parseAsync(
			[
				'node',
				'test',
				'membership',
				'create',
				'--parent-gid',
				'proj1',
				'--member-gid',
				'u1',
				'--access-level',
				'editor',
			],
			{ from: 'node' },
		)

		expect(createMembershipMock).toHaveBeenCalledWith('proj1', 'u1', { access_level: 'editor' })
	})

	it('membership update forwards the access level', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		updateMembershipMock.mockResolvedValue({ gid: 'm1', access_level: 'viewer' })
		const program = new Command().addCommand(membershipCommand())

		await program.parseAsync(['node', 'test', 'membership', 'update', 'm1', '--access-level', 'viewer'], {
			from: 'node',
		})

		expect(updateMembershipMock).toHaveBeenCalledWith('m1', { access_level: 'viewer' })
	})

	it('membership update requires an access level', async () => {
		const program = new Command().exitOverride().addCommand(membershipCommand().exitOverride())

		await expect(program.parseAsync(['node', 'test', 'membership', 'update', 'm1'], { from: 'node' })).rejects.toThrow(
			/--access-level/,
		)
	})

	it('membership delete emits a structured acknowledgement with --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command()
			.option('--json')
			.addCommand(membershipCommand(stubApi({ deleteMembership: vi.fn().mockResolvedValue(undefined) })))

		await program.parseAsync(['node', 'test', '--json', 'membership', 'delete', 'm1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'membership', gid: 'm1', already_absent: false }, null, 2),
		)
	})
})
