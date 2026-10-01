import { describe, expect, it, vi } from 'vitest'

const createClientMock = vi.fn()
const createAsanaAiStudioGatewayMock = vi.fn()
const createAsanaAttachmentGatewayMock = vi.fn()
const createAsanaCustomFieldGatewayMock = vi.fn()
const createAsanaGoalGatewayMock = vi.fn()
const createAsanaMembershipGatewayMock = vi.fn()
const createAsanaOooGatewayMock = vi.fn()
const createAsanaJobGatewayMock = vi.fn()
const createAsanaPortfolioGatewayMock = vi.fn()
const createAsanaProjectGatewayMock = vi.fn()
const createAsanaProjectTemplateGatewayMock = vi.fn()
const createAsanaRuleGatewayMock = vi.fn()
const createAsanaSearchGatewayMock = vi.fn()
const createAsanaSectionGatewayMock = vi.fn()
const createAsanaStoryGatewayMock = vi.fn()
const createAsanaTagGatewayMock = vi.fn()
const createAsanaTaskGatewayMock = vi.fn()
const createAsanaTaskTemplateGatewayMock = vi.fn()
const createAsanaTeamGatewayMock = vi.fn()
const createAsanaUserGatewayMock = vi.fn()
const createAsanaWorkspaceGatewayMock = vi.fn()

vi.mock('./client.js', () => ({
	createClient: createClientMock,
}))

vi.mock('./ai-studio/gateway.js', () => ({
	createAsanaAiStudioGateway: createAsanaAiStudioGatewayMock,
}))

vi.mock('./attachments/gateway.js', () => ({
	createAsanaAttachmentGateway: createAsanaAttachmentGatewayMock,
}))

vi.mock('./custom-fields/gateway.js', () => ({
	createAsanaCustomFieldGateway: createAsanaCustomFieldGatewayMock,
}))

vi.mock('./goals/gateway.js', () => ({
	createAsanaGoalGateway: createAsanaGoalGatewayMock,
}))

vi.mock('./jobs/gateway.js', () => ({
	createAsanaJobGateway: createAsanaJobGatewayMock,
}))

vi.mock('./memberships/gateway.js', () => ({
	createAsanaMembershipGateway: createAsanaMembershipGatewayMock,
}))

vi.mock('./ooo/gateway.js', () => ({
	createAsanaOooGateway: createAsanaOooGatewayMock,
}))

vi.mock('./portfolios/gateway.js', () => ({
	createAsanaPortfolioGateway: createAsanaPortfolioGatewayMock,
}))

vi.mock('./projects/gateway.js', () => ({
	createAsanaProjectGateway: createAsanaProjectGatewayMock,
}))

vi.mock('./project-templates/gateway.js', () => ({
	createAsanaProjectTemplateGateway: createAsanaProjectTemplateGatewayMock,
}))

vi.mock('./rules/gateway.js', () => ({
	createAsanaRuleGateway: createAsanaRuleGatewayMock,
}))

vi.mock('./search/gateway.js', () => ({
	createAsanaSearchGateway: createAsanaSearchGatewayMock,
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

vi.mock('./task-templates/gateway.js', () => ({
	createAsanaTaskTemplateGateway: createAsanaTaskTemplateGatewayMock,
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
	it('creates one shared Asana client passed to all 20 domain gateways', () => {
		const client = { id: 'shared-client' }
		createClientMock.mockReturnValue(client)
		for (const mock of [
			createAsanaAiStudioGatewayMock,
			createAsanaAttachmentGatewayMock,
			createAsanaCustomFieldGatewayMock,
			createAsanaGoalGatewayMock,
			createAsanaMembershipGatewayMock,
			createAsanaOooGatewayMock,
			createAsanaJobGatewayMock,
			createAsanaPortfolioGatewayMock,
			createAsanaProjectGatewayMock,
			createAsanaProjectTemplateGatewayMock,
			createAsanaRuleGatewayMock,
			createAsanaSearchGatewayMock,
			createAsanaSectionGatewayMock,
			createAsanaStoryGatewayMock,
			createAsanaTagGatewayMock,
			createAsanaTaskGatewayMock,
			createAsanaTaskTemplateGatewayMock,
			createAsanaTeamGatewayMock,
			createAsanaUserGatewayMock,
			createAsanaWorkspaceGatewayMock,
		]) {
			mock.mockReturnValue({})
		}

		createRuntimeContext()

		expect(createClientMock).toHaveBeenCalledTimes(1)
		expect(createAsanaAiStudioGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaAttachmentGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaCustomFieldGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaGoalGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaMembershipGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaOooGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaJobGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaPortfolioGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaProjectGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaProjectTemplateGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaRuleGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaSearchGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaSectionGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaStoryGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaTagGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaTaskGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaTaskTemplateGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaTeamGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaUserGatewayMock).toHaveBeenCalledWith(client)
		expect(createAsanaWorkspaceGatewayMock).toHaveBeenCalledWith(client)
	})
})
