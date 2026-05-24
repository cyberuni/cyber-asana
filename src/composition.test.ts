import { describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()
const createAsanaTagGatewayMock = vi.fn()
const createAsanaStoryGatewayMock = vi.fn()

vi.mock('./client.js', () => ({
	createClient: createClientMock,
}))

vi.mock('./tags/gateway.js', () => ({
	createAsanaTagGateway: createAsanaTagGatewayMock,
}))

vi.mock('./stories/gateway.js', () => ({
	createAsanaStoryGateway: createAsanaStoryGatewayMock,
}))

const { createRuntimeContext } = await import('./composition.js')

describe('composition', () => {
	it('creates one shared Asana client for tags and stories gateways', () => {
		const client = { id: 'shared-client' }
		createClientMock.mockReturnValue(client)
		createAsanaTagGatewayMock.mockReturnValue({})
		createAsanaStoryGatewayMock.mockReturnValue({})

		createRuntimeContext()

		expect(createClientMock).toHaveBeenCalledTimes(1)
		expect(createAsanaTagGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaStoryGatewayMock).toHaveBeenCalledWith(client)
	})
})
