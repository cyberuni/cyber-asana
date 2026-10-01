import Asana from 'asana'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { listAiStudioRuns, listAiStudioSeats } from './api.js'

vi.mock('../client.js', () => ({
	createClient: () => ({}),
}))

const mockRun = { gid: 'run1', resource_type: 'ai_studio_run', status: 'success', credits_used: 12 }
const mockSeat = { gid: 'seat1', resource_type: 'ai_studio_seat', license: 'ai_studio_pro', state: 'active' }

describe('ai-studio/api', () => {
	afterEach(() => vi.restoreAllMocks())

	it('listAiStudioRuns scopes by workspace with the default page size', async () => {
		vi.spyOn(Asana.AIStudioUsageAPIApi.prototype, 'getAiStudioRuns').mockResolvedValue({ data: [mockRun] } as never)

		const result = await listAiStudioRuns('ws1')

		expect(result).toEqual({ data: [mockRun], next_page: null, limit: 100 })
		expect(Asana.AIStudioUsageAPIApi.prototype.getAiStudioRuns).toHaveBeenCalledWith('ws1', { limit: 100 })
	})

	it('listAiStudioRuns forwards the usage window, division, and offset', async () => {
		vi.spyOn(Asana.AIStudioUsageAPIApi.prototype, 'getAiStudioRuns').mockResolvedValue({ data: [] } as never)

		await listAiStudioRuns('ws1', {
			startAt: '2026-01-01T00:00:00Z',
			endAt: '2026-02-01T00:00:00Z',
			divisionGid: 'div1',
			limit: 50,
			offset: 'tok',
		})

		expect(Asana.AIStudioUsageAPIApi.prototype.getAiStudioRuns).toHaveBeenCalledWith('ws1', {
			limit: 50,
			offset: 'tok',
			start_at: '2026-01-01T00:00:00Z',
			end_at: '2026-02-01T00:00:00Z',
			division_gid: 'div1',
		})
	})

	it('listAiStudioRuns drops opt_fields, which the usage endpoints do not take', async () => {
		vi.spyOn(Asana.AIStudioUsageAPIApi.prototype, 'getAiStudioRuns').mockResolvedValue({ data: [] } as never)

		await listAiStudioRuns('ws1', { optFields: 'gid,status' })

		expect(Asana.AIStudioUsageAPIApi.prototype.getAiStudioRuns).toHaveBeenCalledWith('ws1', { limit: 100 })
	})

	it('listAiStudioSeats forwards the state and division filters', async () => {
		vi.spyOn(Asana.AIStudioUsageAPIApi.prototype, 'getAiStudioSeats').mockResolvedValue({ data: [mockSeat] } as never)

		const result = await listAiStudioSeats('ws1', { state: 'active', divisionGid: 'div1' })

		expect(result).toEqual([mockSeat])
		expect(Asana.AIStudioUsageAPIApi.prototype.getAiStudioSeats).toHaveBeenCalledWith('ws1', {
			limit: 100,
			state: 'active',
			division_gid: 'div1',
		})
	})
})
