import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { JobFailedError } from '../platform/job-polling.js'
import {
	createProjectTemplateApi,
	getProjectTemplate,
	instantiateProject,
	listProjectTemplates,
	listProjectTemplatesForTeam,
} from './api.js'

vi.mock('../platform/client.js', () => ({
	createClient: () => ({}),
}))

const mockTemplate = { gid: 'tpl1', name: 'Client onboarding', team: { gid: 'team1', name: 'Ops' } }
const mockJob = { gid: 'job1', status: 'in_progress' }
const succeededJob = { gid: 'job1', status: 'succeeded', new_project: { gid: 'proj1', name: 'Acme onboarding' } }

describe('project-templates/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listProjectTemplates filters by workspace', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'getProjectTemplates').mockResolvedValue({
			data: [mockTemplate],
		} as never)

		const result = await listProjectTemplates({ workspace: 'ws1' })

		expect(result).toEqual({ data: [mockTemplate], next_page: null, limit: 100 })
		expect(Asana.ProjectTemplatesApi.prototype.getProjectTemplates).toHaveBeenCalledWith({
			workspace: 'ws1',
			limit: 100,
		})
	})

	it('listProjectTemplates filters by team', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'getProjectTemplates').mockResolvedValue({
			data: [mockTemplate],
		} as never)

		await listProjectTemplates({ team: 'team1' }, { limit: 5 })

		expect(Asana.ProjectTemplatesApi.prototype.getProjectTemplates).toHaveBeenCalledWith({
			team: 'team1',
			limit: 5,
		})
	})

	it('listProjectTemplatesForTeam calls the team-scoped endpoint', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'getProjectTemplatesForTeam').mockResolvedValue({
			data: [mockTemplate],
		} as never)

		const result = await listProjectTemplatesForTeam('team1')

		expect(result).toEqual({ data: [mockTemplate], next_page: null, limit: 100 })
		expect(Asana.ProjectTemplatesApi.prototype.getProjectTemplatesForTeam).toHaveBeenCalledWith('team1', {
			limit: 100,
		})
	})

	it('getProjectTemplate calls getProjectTemplate with the gid', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'getProjectTemplate').mockResolvedValue({
			data: mockTemplate,
		} as never)

		const result = await getProjectTemplate('tpl1')

		expect(result).toEqual(mockTemplate)
		expect(Asana.ProjectTemplatesApi.prototype.getProjectTemplate).toHaveBeenCalledWith('tpl1', {})
	})

	it('instantiateProject posts the instantiation body and returns the job', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'instantiateProject').mockResolvedValue({
			data: mockJob,
		} as never)

		const result = await instantiateProject('tpl1', {
			name: 'Acme onboarding',
			team: 'team1',
			public: false,
			requestedDates: [{ gid: 'date1', value: '2026-09-01' }],
		})

		expect(result).toEqual(mockJob)
		expect(Asana.ProjectTemplatesApi.prototype.instantiateProject).toHaveBeenCalledWith('tpl1', {
			body: {
				data: {
					name: 'Acme onboarding',
					team: 'team1',
					public: false,
					requested_dates: [{ gid: 'date1', value: '2026-09-01' }],
				},
			},
		})
	})

	it('instantiateProject omits fields that were not supplied', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'instantiateProject').mockResolvedValue({
			data: mockJob,
		} as never)

		await instantiateProject('tpl1', { name: 'Acme onboarding' })

		expect(Asana.ProjectTemplatesApi.prototype.instantiateProject).toHaveBeenCalledWith('tpl1', {
			body: { data: { name: 'Acme onboarding' } },
		})
	})

	it('instantiateProjectAndWait polls the job until it succeeds', async () => {
		const gateway = {
			listProjectTemplates: vi.fn(),
			listProjectTemplatesForTeam: vi.fn(),
			getProjectTemplate: vi.fn(),
			instantiateProject: vi.fn().mockResolvedValue(mockJob),
		}
		const jobs = { getJob: vi.fn().mockResolvedValueOnce(mockJob).mockResolvedValueOnce(succeededJob) }
		const api = createProjectTemplateApi(gateway, { jobs })

		const result = await api.instantiateProjectAndWait(
			'tpl1',
			{ name: 'Acme onboarding' },
			{ intervalMs: 0, maxAttempts: 5 },
		)

		expect(result).toEqual(succeededJob)
		expect(jobs.getJob).toHaveBeenCalledTimes(2)
		expect(jobs.getJob).toHaveBeenCalledWith('job1')
	})

	it('instantiateProjectAndWait throws when the job fails, rather than reporting a missing project', async () => {
		const gateway = {
			listProjectTemplates: vi.fn(),
			listProjectTemplatesForTeam: vi.fn(),
			getProjectTemplate: vi.fn(),
			instantiateProject: vi.fn().mockResolvedValue(mockJob),
		}
		const jobs = { getJob: vi.fn().mockResolvedValue({ gid: 'job1', status: 'failed' }) }
		const api = createProjectTemplateApi(gateway, { jobs })

		const error = await api
			.instantiateProjectAndWait('tpl1', { name: 'Acme onboarding' }, { intervalMs: 0, maxAttempts: 5 })
			.catch((e) => e)

		expect(error).toBeInstanceOf(JobFailedError)
		expect(error.jobGid).toBe('job1')
	})

	it('instantiateProject carries the privacy setting into the instantiation body', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'instantiateProject').mockResolvedValue({
			data: mockJob,
		} as never)

		await instantiateProject('tpl1', { name: 'Acme onboarding', privacySetting: 'private_to_team' })

		expect(Asana.ProjectTemplatesApi.prototype.instantiateProject).toHaveBeenCalledWith('tpl1', {
			body: { data: { name: 'Acme onboarding', privacy_setting: 'private_to_team' } },
		})
	})

	it('instantiateProject carries the strict date flag into the instantiation body', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'instantiateProject').mockResolvedValue({
			data: mockJob,
		} as never)

		await instantiateProject('tpl1', { name: 'Acme onboarding', isStrict: true })

		expect(Asana.ProjectTemplatesApi.prototype.instantiateProject).toHaveBeenCalledWith('tpl1', {
			body: { data: { name: 'Acme onboarding', is_strict: true } },
		})
	})

	it('instantiateProject carries requested roles into the instantiation body', async () => {
		vi.spyOn(Asana.ProjectTemplatesApi.prototype, 'instantiateProject').mockResolvedValue({
			data: mockJob,
		} as never)

		await instantiateProject('tpl1', {
			name: 'Acme onboarding',
			requestedRoles: [{ gid: 'role1', value: 'me' }],
		})

		expect(Asana.ProjectTemplatesApi.prototype.instantiateProject).toHaveBeenCalledWith('tpl1', {
			body: { data: { name: 'Acme onboarding', requested_roles: [{ gid: 'role1', value: 'me' }] } },
		})
	})
})
