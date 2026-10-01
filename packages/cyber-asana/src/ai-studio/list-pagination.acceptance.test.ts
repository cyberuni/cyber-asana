import { describe, expect, it, vi } from 'vitest'
import { paginatingListResult } from '../testing/paginating-gateway.js'
import { createAiStudioApi } from './api.js'
import type { AiStudioGateway } from './gateway.js'
import {
	defineAiStudioRunListPaginationAcceptanceSpecs,
	defineAiStudioSeatListPaginationAcceptanceSpecs,
} from './list-pagination.acceptance.js'

const workspaceGid = 'ws-test'

const runPages = [
	[{ gid: 'run1', status: 'success' }],
	[{ gid: 'run2', status: 'failed' }],
	[{ gid: 'run3', status: 'cancelled' }],
]

const seatPages = [
	[{ gid: 'seat1', state: 'active' }],
	[{ gid: 'seat2', state: 'revoked' }],
	[{ gid: 'seat3', state: 'expired' }],
]

function createPaginatingAiStudioGateway(): AiStudioGateway {
	return {
		listAiStudioRuns: vi.fn(async (_workspaceGid, opts) => paginatingListResult(runPages, opts)),
		listAiStudioSeats: vi.fn(async (_workspaceGid, opts) => paginatingListResult(seatPages, opts)),
	}
}

describe(
	'ai-studio/runs list pagination acceptance',
	defineAiStudioRunListPaginationAcceptanceSpecs({
		getApi: () => createAiStudioApi(createPaginatingAiStudioGateway()),
		workspaceGid,
	}),
)

describe(
	'ai-studio/seats list pagination acceptance',
	defineAiStudioSeatListPaginationAcceptanceSpecs({
		getApi: () => createAiStudioApi(createPaginatingAiStudioGateway()),
		workspaceGid,
	}),
)

describe('ai-studio list pagination acceptance gateway double', () => {
	it('exercises listAiStudioRuns without importing the Asana SDK', async () => {
		const gateway = createPaginatingAiStudioGateway()
		const api = createAiStudioApi(gateway)

		const result = await api.listAiStudioRuns(workspaceGid, { limit: 25, divisionGid: 'div1' })

		expect(result).toEqual({ data: runPages[0], next_page: { offset: 'page2' }, limit: 25 })
		expect(gateway.listAiStudioRuns).toHaveBeenCalledWith(workspaceGid, { limit: 25, divisionGid: 'div1' })
	})

	it('exercises listAiStudioSeats without importing the Asana SDK', async () => {
		const gateway = createPaginatingAiStudioGateway()
		const api = createAiStudioApi(gateway)

		const result = await api.listAiStudioSeats(workspaceGid, { limit: 25, state: 'active' })

		expect(result).toEqual({ data: seatPages[0], next_page: { offset: 'page2' }, limit: 25 })
		expect(gateway.listAiStudioSeats).toHaveBeenCalledWith(workspaceGid, { limit: 25, state: 'active' })
	})
})
