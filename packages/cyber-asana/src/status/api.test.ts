import { describe, expect, it, vi } from 'vitest'
import { createStatusApi } from './api.js'

const mockStatus = { gid: 'st1', status_type: 'on_track', text: 'All good' }

function overviewGateways() {
	return {
		portfolios: { getPortfolio: vi.fn(), listPortfolioItems: vi.fn() },
		projects: { getProject: vi.fn(), getProjectTaskCounts: vi.fn() },
	}
}

describe('createStatusApi', () => {
	it('uses the provided gateway for listStatuses', async () => {
		const mockListStatuses = vi.fn().mockResolvedValue({ data: [mockStatus], next_page: null, limit: 100 })
		const api = createStatusApi(
			{
				listStatuses: mockListStatuses,
				getStatus: vi.fn(),
				createStatus: vi.fn(),
				deleteStatus: vi.fn(),
			},
			overviewGateways(),
		)

		const result = await api.listStatuses('proj1', { limit: 25 })

		expect(result).toEqual({ data: [mockStatus], next_page: null, limit: 100 })
		expect(mockListStatuses).toHaveBeenCalledWith('proj1', { limit: 25 })
	})

	it('composes the status, portfolio, and project gateways for getStatusOverview', async () => {
		const listStatuses = vi.fn().mockResolvedValue([mockStatus])
		const getProject = vi.fn().mockResolvedValue({ gid: 'proj1', name: 'Apollo' })
		const getProjectTaskCounts = vi.fn().mockResolvedValue({ num_tasks: 3 })
		const api = createStatusApi(
			{ listStatuses, getStatus: vi.fn(), createStatus: vi.fn(), deleteStatus: vi.fn() },
			{
				portfolios: { getPortfolio: vi.fn(), listPortfolioItems: vi.fn() },
				projects: { getProject, getProjectTaskCounts },
			},
		)

		const result = await api.getStatusOverview('proj1', { parentType: 'project' })

		expect(result.parent).toEqual({
			gid: 'proj1',
			name: 'Apollo',
			resource_type: 'project',
			status: mockStatus,
			counts: { num_tasks: 3 },
		})
		expect(getProject).toHaveBeenCalledWith('proj1')
	})

	it('uses the provided gateway for createStatus', async () => {
		const mockCreateStatus = vi.fn().mockResolvedValue(mockStatus)
		const api = createStatusApi(
			{
				listStatuses: vi.fn(),
				getStatus: vi.fn(),
				createStatus: mockCreateStatus,
				deleteStatus: vi.fn(),
			},
			overviewGateways(),
		)

		const result = await api.createStatus('proj1', { status_type: 'on_track', text: 'All good' })

		expect(result).toEqual(mockStatus)
		expect(mockCreateStatus).toHaveBeenCalledWith('proj1', { status_type: 'on_track', text: 'All good' })
	})
})

describe('createStatusApi createStatus validation (G13)', () => {
	const gateway = () => ({
		listStatuses: vi.fn(),
		getStatus: vi.fn(),
		createStatus: vi.fn().mockResolvedValue(mockStatus),
		deleteStatus: vi.fn(),
	})

	it('rejects an unknown status_type before any call', async () => {
		const g = gateway()
		const api = createStatusApi(g, overviewGateways())
		await expect(api.createStatus('p1', { status_type: 'green' })).rejects.toMatchObject({
			code: 'status-type-invalid',
		})
		expect(g.createStatus).not.toHaveBeenCalled()
	})

	it('posts a shared type without looking the parent up', async () => {
		const g = gateway()
		const gateways = overviewGateways()
		await createStatusApi(g, gateways).createStatus('p1', { status_type: 'at_risk' })
		expect(g.createStatus).toHaveBeenCalledOnce()
		expect(gateways.portfolios.getPortfolio).not.toHaveBeenCalled()
	})

	it('checks an exclusive type against the stated parent type, with no lookup', async () => {
		const g = gateway()
		const api = createStatusApi(g, overviewGateways())
		await expect(api.createStatus('p1', { status_type: 'achieved' }, { parentType: 'project' })).rejects.toMatchObject({
			code: 'status-type-invalid',
		})
		await api.createStatus('g1', { status_type: 'achieved' }, { parentType: 'goal' })
		expect(g.createStatus).toHaveBeenCalledOnce()
	})

	it('detects the parent type for an exclusive type when none is stated', async () => {
		const g = gateway()
		const gateways = {
			...overviewGateways(),
			goals: { getGoal: vi.fn().mockResolvedValue({ gid: 'g1' }) },
		}
		gateways.portfolios.getPortfolio.mockRejectedValue(new Error('404'))
		gateways.projects.getProject.mockRejectedValue(new Error('404'))
		const api = createStatusApi(g, gateways)
		await expect(api.createStatus('g1', { status_type: 'on_hold' })).rejects.toMatchObject({
			code: 'status-type-invalid',
		})
		await api.createStatus('g1', { status_type: 'dropped' })
		expect(g.createStatus).toHaveBeenCalledOnce()
	})
})
