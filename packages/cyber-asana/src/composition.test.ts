import { describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()
const createAsanaAttachmentGatewayMock = vi.fn()
const createAsanaGoalGatewayMock = vi.fn()
const createAsanaPortfolioGatewayMock = vi.fn()
const createAsanaProjectGatewayMock = vi.fn()
const createAsanaSectionGatewayMock = vi.fn()
const createAsanaStoryGatewayMock = vi.fn()
const createAsanaTagGatewayMock = vi.fn()
const createAsanaTaskGatewayMock = vi.fn()
const createAsanaTeamGatewayMock = vi.fn()
const createAsanaUserGatewayMock = vi.fn()
const createAsanaWorkspaceGatewayMock = vi.fn()

vi.mock('./client.js', () => ({
	createClient: createClientMock,
}))

vi.mock('./attachments/gateway.js', () => ({
	createAsanaAttachmentGateway: createAsanaAttachmentGatewayMock,
}))

vi.mock('./goals/gateway.js', () => ({
	createAsanaGoalGateway: createAsanaGoalGatewayMock,
}))

vi.mock('./portfolios/gateway.js', () => ({
	createAsanaPortfolioGateway: createAsanaPortfolioGatewayMock,
}))

vi.mock('./projects/gateway.js', () => ({
	createAsanaProjectGateway: createAsanaProjectGatewayMock,
}))

vi.mock('./sections/gateway.js', () => ({
	createAsanaSectionGateway: createAsanaSectionGatewayMock,
}))

vi.mock('./stories/gateway.js', () => ({
	createAsanaStoryGateway: createAsanaStoryGatewayMock,
}))

vi.mock('./tags/gateway.js', () => ({
	createAsanaTagGateway: createAsanaTagGatewayMock,
}))

vi.mock('./tasks/gateway.js', () => ({
	createAsanaTaskGateway: createAsanaTaskGatewayMock,
}))

vi.mock('./teams/gateway.js', () => ({
	createAsanaTeamGateway: createAsanaTeamGatewayMock,
}))

vi.mock('./users/gateway.js', () => ({
	createAsanaUserGateway: createAsanaUserGatewayMock,
}))

vi.mock('./workspaces/gateway.js', () => ({
	createAsanaWorkspaceGateway: createAsanaWorkspaceGatewayMock,
}))

const { createRuntimeContext } = await import('./composition.js')

describe('composition', () => {
	it('creates one shared Asana client passed to all 11 domain gateways', () => {
		const client = { id: 'shared-client' }
		createClientMock.mockReturnValue(client)
		for (const mock of [
			createAsanaAttachmentGatewayMock,
			createAsanaGoalGatewayMock,
			createAsanaPortfolioGatewayMock,
			createAsanaProjectGatewayMock,
			createAsanaSectionGatewayMock,
			createAsanaStoryGatewayMock,
			createAsanaTagGatewayMock,
			createAsanaTaskGatewayMock,
			createAsanaTeamGatewayMock,
			createAsanaUserGatewayMock,
			createAsanaWorkspaceGatewayMock,
		]) {
			mock.mockReturnValue({})
		}

		createRuntimeContext()

		expect(createClientMock).toHaveBeenCalledTimes(1)
		expect(createAsanaAttachmentGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaGoalGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaPortfolioGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaProjectGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaSectionGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaStoryGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaTagGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaTaskGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaTeamGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaUserGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaWorkspaceGatewayMock).toHaveBeenCalledWith(client)
	})
})
