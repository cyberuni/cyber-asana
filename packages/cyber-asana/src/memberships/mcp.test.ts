import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MembershipApi } from './api.js'

const listMembershipsMock = vi.fn()
const createMembershipMock = vi.fn()
const updateMembershipMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		listMemberships: listMembershipsMock,
		createMembership: createMembershipMock,
		updateMembership: updateMembershipMock,
	}
})

const { registerMembershipTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	return {
		handlers,
		tool(name: string, _description: string, _schema: unknown, handler: ToolHandler) {
			handlers.set(name, handler)
		},
	}
}

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

describe('memberships/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_membership_list forwards filters and pagination options', async () => {
		listMembershipsMock.mockResolvedValue({ data: [], next_page: null, limit: 100 })
		const server = createServer()
		registerMembershipTools(server as any)

		await server.handlers.get('asana_membership_list')?.({
			parent_gid: 'proj1',
			member_gid: 'u1',
			limit: 25,
		})

		expect(listMembershipsMock).toHaveBeenCalledWith({ parent: 'proj1', member: 'u1' }, { limit: 25 })
	})

	it('asana_membership_create forwards parent, member, and access level', async () => {
		createMembershipMock.mockResolvedValue({ gid: 'm1' })
		const server = createServer()
		registerMembershipTools(server as any)

		await server.handlers.get('asana_membership_create')?.({
			parent_gid: 'proj1',
			member_gid: 'u1',
			access_level: 'editor',
		})

		expect(createMembershipMock).toHaveBeenCalledWith('proj1', 'u1', { access_level: 'editor' })
	})

	it('asana_membership_update forwards the access level', async () => {
		updateMembershipMock.mockResolvedValue({ gid: 'm1', access_level: 'viewer' })
		const server = createServer()
		registerMembershipTools(server as any)

		await server.handlers.get('asana_membership_update')?.({
			membership_gid: 'm1',
			access_level: 'viewer',
		})

		expect(updateMembershipMock).toHaveBeenCalledWith('m1', { access_level: 'viewer' })
	})

	it('asana_membership_delete reports an idempotent deletion', async () => {
		const deleteMembership = vi.fn().mockResolvedValue(undefined)
		const server = createServer()
		registerMembershipTools(server as any, stubApi({ deleteMembership }))

		const result = await server.handlers.get('asana_membership_delete')?.({ membership_gid: 'm1' })

		expect(deleteMembership).toHaveBeenCalledWith('m1')
		expect(JSON.parse(result.content[0].text)).toEqual({
			deleted: true,
			resource: 'membership',
			gid: 'm1',
			already_absent: false,
		})
	})

	it('membership tools can use injected dependencies', async () => {
		const getMembership = vi.fn().mockResolvedValue({ gid: 'm1' })
		const server = createServer()
		registerMembershipTools(server as any, stubApi({ getMembership }))

		await server.handlers.get('asana_membership_get')?.({ membership_gid: 'm1' })

		expect(getMembership).toHaveBeenCalledWith('m1')
	})
})
