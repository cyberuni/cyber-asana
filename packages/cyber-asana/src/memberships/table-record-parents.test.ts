import { Command } from 'commander'
import { describe, expect, it, vi } from 'vitest'
import { membershipCommand } from './cli.js'
import { registerMembershipTools } from './mcp.js'

function apiDouble() {
	return {
		listMemberships: vi.fn().mockResolvedValue([]),
		getMembership: vi.fn(),
		createMembership: vi.fn().mockResolvedValue({ gid: 'm1' }),
		updateMembership: vi.fn(),
		deleteMembership: vi.fn(),
	}
}

describe('memberships on a table or record', () => {
	it('names table and record as parents in the CLI help', () => {
		const help = membershipCommand(apiDouble()).helpInformation()
		const sub = (name: string) =>
			membershipCommand(apiDouble())
				.commands.find((c) => c.name() === name)!
				.helpInformation()
		const full = [help, sub('list'), sub('create')].join('\n')

		expect(full).toMatch(/table/)
		expect(full).toMatch(/record/)
	})

	it('lists and creates memberships under a table or record GID through the unified endpoint', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = apiDouble()
		const program = new Command().addCommand(membershipCommand(api))

		await program.parseAsync(['node', 'test', 'membership', 'list', '--parent-gid', 'table1'], { from: 'node' })
		await program.parseAsync(
			[
				'node',
				'test',
				'membership',
				'create',
				'--parent-gid',
				'record1',
				'--member-gid',
				'u1',
				'--access-level',
				'viewer',
			],
			{ from: 'node' },
		)

		expect(api.listMemberships).toHaveBeenCalledWith({ parent: 'table1' }, expect.anything())
		expect(api.createMembership).toHaveBeenCalledWith('record1', 'u1', { access_level: 'viewer' })
	})

	it('describes table and record parents in the MCP tools', () => {
		const tools = new Map<string, { description: string; schema: Record<string, { description?: string }> }>()
		registerMembershipTools(
			{ tool: (name: string, description: string, schema: never) => tools.set(name, { description, schema }) } as never,
			apiDouble() as never,
		)

		for (const name of ['asana_membership_list', 'asana_membership_create']) {
			const { description, schema } = tools.get(name)!
			expect(`${description} ${schema.parent_gid.description}`).toMatch(/table/)
			expect(`${description} ${schema.parent_gid.description}`).toMatch(/record/)
		}
		expect(tools.get('asana_membership_list')!.schema.resource_subtype.description).toMatch(/table_membership/)
	})
})
