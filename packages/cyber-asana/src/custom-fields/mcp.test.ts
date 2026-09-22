import { afterEach, describe, expect, it, vi } from 'vitest'

const listCustomFieldsMock = vi.fn()
const getCustomFieldMock = vi.fn()
const listForProjectMock = vi.fn()
const listForPortfolioMock = vi.fn()
const listForGoalMock = vi.fn()
const listForTeamMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		listCustomFields: listCustomFieldsMock,
		getCustomField: getCustomFieldMock,
		listCustomFieldSettingsForProject: listForProjectMock,
		listCustomFieldSettingsForPortfolio: listForPortfolioMock,
		listCustomFieldSettingsForGoal: listForGoalMock,
		listCustomFieldSettingsForTeam: listForTeamMock,
	}
})

const { registerCustomFieldTools } = await import('./mcp.js')

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

describe('custom-fields/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_custom_field_list forwards workspace gid and pagination options', async () => {
		listCustomFieldsMock.mockResolvedValue({
			data: [{ gid: 'cf1', name: 'Priority', resource_subtype: 'enum' }],
			next_page: null,
			limit: 100,
		})
		const server = createServer()
		registerCustomFieldTools(server as any)

		const result = await server.handlers.get('asana_custom_field_list')?.({
			workspace_gid: 'ws1',
			limit: 50,
			opt_fields: 'gid,name',
		})

		expect(listCustomFieldsMock).toHaveBeenCalledWith('ws1', {
			limit: 50,
			optFields: 'gid,name',
		})
		expect(JSON.parse(result.content[0].text).data).toEqual([
			{ gid: 'cf1', name: 'Priority', resource_subtype: 'enum' },
		])
	})

	it('asana_custom_field_get forwards the custom field gid and returns its enum options', async () => {
		getCustomFieldMock.mockResolvedValue({
			gid: 'cf1',
			name: 'Priority',
			resource_subtype: 'enum',
			enum_options: [{ gid: 'opt1', name: 'High' }],
		})
		const server = createServer()
		registerCustomFieldTools(server as any)

		const result = await server.handlers.get('asana_custom_field_get')?.({ custom_field_gid: 'cf1' })

		expect(getCustomFieldMock).toHaveBeenCalledWith('cf1', undefined)
		expect(JSON.parse(result.content[0].text).enum_options).toEqual([{ gid: 'opt1', name: 'High' }])
	})

	it('custom field tools can use injected dependencies', async () => {
		const injectedGetCustomField = vi.fn().mockResolvedValue({ gid: 'cf1', name: 'Priority' })
		const server = createServer()
		registerCustomFieldTools(server as any, {
			listCustomFields: vi.fn(),
			getCustomField: injectedGetCustomField,
			listCustomFieldSettingsForProject: vi.fn(),
			listCustomFieldSettingsForPortfolio: vi.fn(),
			listCustomFieldSettingsForGoal: vi.fn(),
			listCustomFieldSettingsForTeam: vi.fn(),
		})

		await server.handlers.get('asana_custom_field_get')?.({ custom_field_gid: 'cf1' })

		expect(injectedGetCustomField).toHaveBeenCalledWith('cf1', undefined)
	})
})

describe('custom-fields/mcp custom field settings', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_custom_field_list_for_project returns the settings as JSON', async () => {
		const settings = [{ gid: 'cfs1', custom_field: { gid: 'cf1', name: 'Priority' } }]
		listForProjectMock.mockResolvedValue(settings)
		const server = createServer()
		registerCustomFieldTools(server as any)

		const result = await server.handlers.get('asana_custom_field_list_for_project')?.({
			project_gid: 'proj1',
			limit: 25,
			opt_fields: 'custom_field.name',
		})

		expect(listForProjectMock).toHaveBeenCalledWith('proj1', { limit: 25, optFields: 'custom_field.name' })
		expect(result).toEqual({ content: [{ type: 'text', text: JSON.stringify(settings) }] })
	})

	it('asana_custom_field_list_for_portfolio forwards pagination options', async () => {
		listForPortfolioMock.mockResolvedValue({ data: [] })
		const server = createServer()
		registerCustomFieldTools(server as any)

		await server.handlers.get('asana_custom_field_list_for_portfolio')?.({ portfolio_gid: 'port1', limit: 10 })

		expect(listForPortfolioMock).toHaveBeenCalledWith('port1', { limit: 10 })
	})

	it('asana_custom_field_list_for_goal forwards the goal gid', async () => {
		listForGoalMock.mockResolvedValue({ data: [] })
		const server = createServer()
		registerCustomFieldTools(server as any)

		await server.handlers.get('asana_custom_field_list_for_goal')?.({ goal_gid: 'goal1' })

		expect(listForGoalMock).toHaveBeenCalledWith('goal1', {})
	})

	it('asana_custom_field_list_for_team forwards the team gid', async () => {
		listForTeamMock.mockResolvedValue({ data: [] })
		const server = createServer()
		registerCustomFieldTools(server as any)

		await server.handlers.get('asana_custom_field_list_for_team')?.({ team_gid: 'team1' })

		expect(listForTeamMock).toHaveBeenCalledWith('team1', {})
	})

	it('the settings tools can use an injected api dependency', async () => {
		const injected = vi.fn().mockResolvedValue({ data: [] })
		const server = createServer()
		registerCustomFieldTools(server as any, {
			listCustomFields: vi.fn(),
			getCustomField: vi.fn(),
			listCustomFieldSettingsForProject: injected,
			listCustomFieldSettingsForPortfolio: vi.fn(),
			listCustomFieldSettingsForGoal: vi.fn(),
			listCustomFieldSettingsForTeam: vi.fn(),
		})

		await server.handlers.get('asana_custom_field_list_for_project')?.({ project_gid: 'proj1' })

		expect(injected).toHaveBeenCalledWith('proj1', {})
	})
})
