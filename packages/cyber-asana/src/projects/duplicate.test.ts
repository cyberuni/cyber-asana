import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JobFailedError } from '../platform/job-polling.js'
import { createProjectApi } from './api.js'
import { projectCommand } from './cli.js'
import { createAsanaProjectGateway, type ProjectGateway } from './gateway.js'
import { registerProjectTools } from './mcp.js'

describe('project duplicate: gateway', () => {
	afterEach(() => vi.restoreAllMocks())

	it('posts the name, team, and include list to duplicateProject and returns the job', async () => {
		vi.spyOn(Asana.ProjectsApi.prototype, 'duplicateProject').mockResolvedValue({ data: { gid: 'j1' } } as never)
		const job = await createAsanaProjectGateway({} as Asana.ApiClient).duplicateProject('p1', {
			name: 'Sprint 2',
			team: 't1',
			include: ['members', 'task_notes'],
		})
		expect(job).toEqual({ gid: 'j1' })
		expect(Asana.ProjectsApi.prototype.duplicateProject).toHaveBeenCalledWith('p1', {
			body: { data: { name: 'Sprint 2', team: 't1', include: 'members,task_notes' } },
		})
	})
})

describe('project duplicate: api', () => {
	const gateway = (jobs: Array<{ gid: string; status: string; new_project?: { gid: string } }>) =>
		({ duplicateProject: vi.fn().mockResolvedValue(jobs[0]) }) as unknown as ProjectGateway

	it('waits for the job and returns the succeeded job with the new project', async () => {
		const getJob = vi.fn().mockResolvedValue({ gid: 'j1', status: 'succeeded', new_project: { gid: 'p2' } })
		const api = createProjectApi(gateway([{ gid: 'j1', status: 'in_progress' }]), { jobs: { getJob } })
		const job = await api.duplicateProjectAndWait('p1', { name: 'Sprint 2' }, { sleep: async () => {} })
		expect(job.new_project).toEqual({ gid: 'p2' })
	})

	it('a failed job raises instead of reading as success', async () => {
		const getJob = vi.fn().mockResolvedValue({ gid: 'j1', status: 'failed' })
		const api = createProjectApi(gateway([{ gid: 'j1', status: 'in_progress' }]), { jobs: { getJob } })
		await expect(api.duplicateProjectAndWait('p1', { name: 'x' }, { sleep: async () => {} })).rejects.toBeInstanceOf(
			JobFailedError,
		)
	})
})

describe('project duplicate: cli and mcp', () => {
	afterEach(() => vi.restoreAllMocks())

	it('project duplicate waits by default and prints the new project', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const duplicateProjectAndWait = vi
			.fn()
			.mockResolvedValue({ gid: 'j1', status: 'succeeded', new_project: { gid: 'p2', name: 'Sprint 2' } })
		const program = new Command().addCommand(projectCommand({ duplicateProjectAndWait } as never))
		await program.parseAsync(
			['node', 'test', 'project', 'duplicate', 'p1', '--name', 'Sprint 2', '--team-gid', 't1', '--include', 'members'],
			{ from: 'node' },
		)
		expect(duplicateProjectAndWait).toHaveBeenCalledWith(
			'p1',
			{ name: 'Sprint 2', team: 't1', include: ['members'] },
			expect.objectContaining({ maxAttempts: 60 }),
		)
		expect(logSpy.mock.calls.map((c) => String(c[0])).join('\n')).toContain('cyber-asana project get p2')
	})

	it('project duplicate --no-wait returns the job', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const duplicateProject = vi.fn().mockResolvedValue({ gid: 'j1', status: 'in_progress' })
		const program = new Command().addCommand(projectCommand({ duplicateProject } as never))
		await program.parseAsync(['node', 'test', 'project', 'duplicate', 'p1', '--name', 'S', '--no-wait'], {
			from: 'node',
		})
		expect(duplicateProject).toHaveBeenCalledWith('p1', { name: 'S' })
	})

	it('asana_project_duplicate waits and returns the new project GID', async () => {
		const handlers = new Map<string, (p: any) => Promise<any>>()
		const server = { tool: (n: string, _d: string, _s: unknown, h: any) => handlers.set(n, h) }
		const duplicateProjectAndWait = vi
			.fn()
			.mockResolvedValue({ gid: 'j1', status: 'succeeded', new_project: { gid: 'p2' } })
		registerProjectTools(server as never, { duplicateProjectAndWait } as never)
		const res = await handlers.get('asana_project_duplicate')?.({ project_gid: 'p1', name: 'S' })
		expect(JSON.parse(res.content[0].text).project_gid).toBe('p2')
	})
})
