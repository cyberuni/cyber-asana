import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createProjectApi } from './api.js'
import { projectCommand } from './cli.js'
import { createAsanaProjectGateway, type ProjectGateway } from './gateway.js'
import { registerProjectTools } from './mcp.js'

describe('project followers: gateway and api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('addFollowersToProject posts the follower GIDs under the project', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'addFollowersForProject').mockResolvedValue({ data: { gid: 'p1' } } as never)

		const project = await createAsanaProjectGateway({} as Asana.ApiClient).addFollowersToProject('p1', ['u1', 'u2'])

		expect(project).toEqual({ gid: 'p1' })
		expect(Asana.ProjectsApi.prototype.addFollowersForProject).toHaveBeenCalledWith(
			{ data: { followers: ['u1', 'u2'] } },
			'p1',
			{},
		)
	})

	it('removeFollowersFromProject posts the follower GIDs to removeFollowers', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'removeFollowersForProject').mockResolvedValue({
			data: { gid: 'p1' },
		} as never)

		await createAsanaProjectGateway({} as Asana.ApiClient).removeFollowersFromProject('p1', ['u1'])

		expect(Asana.ProjectsApi.prototype.removeFollowersForProject).toHaveBeenCalledWith(
			{ data: { followers: ['u1'] } },
			'p1',
			{},
		)
	})

	it('the api forwards both calls to the gateway', async () => {
		const addFollowersToProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		const removeFollowersFromProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		const api = createProjectApi({ addFollowersToProject, removeFollowersFromProject } as unknown as ProjectGateway)

		await api.addFollowersToProject('p1', ['u1'])
		await api.removeFollowersFromProject('p1', ['u2'])

		expect(addFollowersToProject).toHaveBeenCalledWith('p1', ['u1'])
		expect(removeFollowersFromProject).toHaveBeenCalledWith('p1', ['u2'])
	})
})

describe('project followers: cli and mcp', () => {
	afterEach(() => vi.restoreAllMocks())

	it('project follower add and remove report what changed', async () => {
		const log = vi.spyOn(console, 'log').mockImplementation(() => {})
		const addFollowersToProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		const removeFollowersFromProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		const program = new Command().addCommand(
			projectCommand({ addFollowersToProject, removeFollowersFromProject } as never),
		)

		await program.parseAsync(['node', 'test', 'project', 'follower', 'add', 'p1', 'u1', 'u2'], { from: 'node' })
		await program.parseAsync(['node', 'test', 'project', 'follower', 'remove', 'p1', 'u1'], { from: 'node' })

		expect(addFollowersToProject).toHaveBeenCalledWith('p1', ['u1', 'u2'])
		expect(removeFollowersFromProject).toHaveBeenCalledWith('p1', ['u1'])
		const text = log.mock.calls.map((c) => String(c[0])).join('\n')
		expect(text).toContain('Added 2 follower(s) to project p1')
		expect(text).toContain('Removed 1 follower(s) from project p1')
	})

	it('asana_project_follower_add and _remove call the api', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: any) => handlers.set(n, h) }
		const addFollowersToProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		const removeFollowersFromProject = vi.fn().mockResolvedValue({ gid: 'p1' })
		registerProjectTools(server as never, { addFollowersToProject, removeFollowersFromProject } as never)

		await handlers.get('asana_project_follower_add')?.({ project_gid: 'p1', follower_gids: ['u1'] })
		await handlers.get('asana_project_follower_remove')?.({ project_gid: 'p1', follower_gids: ['u1'] })

		expect(addFollowersToProject).toHaveBeenCalledWith('p1', ['u1'])
		expect(removeFollowersFromProject).toHaveBeenCalledWith('p1', ['u1'])
	})
})
