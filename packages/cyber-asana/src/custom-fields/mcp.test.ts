import { afterEach, describe, expect, it, vi } from 'vitest'

const listCustomFieldsMock = vi.fn()
const getCustomFieldMock = vi.fn()
const listForProjectMock = vi.fn()
const listForPortfolioMock = vi.fn()
const listForGoalMock = vi.fn()
const listForTeamMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
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
			createCustomField: vi.fn(),
			createEnumOption: vi.fn(),
			insertEnumOption: vi.fn(),
			updateEnumOption: vi.fn(),
			updateCustomField: vi.fn(),
			deleteCustomField: vi.fn(),
			attachCustomField: vi.fn(),
			detachCustomField: vi.fn(),
			attachCustomFieldToPortfolio: vi.fn(),
			detachCustomFieldFromPortfolio: vi.fn(),
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
			createCustomField: vi.fn(),
			createEnumOption: vi.fn(),
			insertEnumOption: vi.fn(),
			updateEnumOption: vi.fn(),
			updateCustomField: vi.fn(),
			deleteCustomField: vi.fn(),
			attachCustomField: vi.fn(),
			detachCustomField: vi.fn(),
			attachCustomFieldToPortfolio: vi.fn(),
			detachCustomFieldFromPortfolio: vi.fn(),
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

describe('custom-fields/mcp writes', () => {
	function setup(over: Record<string, unknown>) {
		const api = {
			listCustomFields: vi.fn(),
			getCustomField: vi.fn(),
			listCustomFieldSettingsForProject: vi.fn(),
			listCustomFieldSettingsForPortfolio: vi.fn(),
			listCustomFieldSettingsForGoal: vi.fn(),
			listCustomFieldSettingsForTeam: vi.fn(),
			createCustomField: vi.fn(),
			createEnumOption: vi.fn(),
			insertEnumOption: vi.fn(),
			updateEnumOption: vi.fn(),
			updateCustomField: vi.fn(),
			deleteCustomField: vi.fn(),
			attachCustomField: vi.fn(),
			detachCustomField: vi.fn(),
			attachCustomFieldToPortfolio: vi.fn(),
			detachCustomFieldFromPortfolio: vi.fn(),
			...over,
		}
		const server = createServer()
		registerCustomFieldTools(server as any, api as any)
		return server
	}

	it('asana_custom_field_create maps its parameters', async () => {
		const createCustomField = vi.fn().mockResolvedValue({ gid: 'cf1' })
		const server = setup({ createCustomField })

		const result = await server.handlers.get('asana_custom_field_create')?.({
			workspace_gid: 'ws1',
			name: 'Sprint',
			type: 'enum',
			enum_options: ['Sprint 1'],
		})

		expect(createCustomField).toHaveBeenCalledWith(
			{
				workspace: 'ws1',
				name: 'Sprint',
				resourceSubtype: 'enum',
				enumOptions: [{ name: 'Sprint 1' }],
			},
			undefined,
		)
		expect(JSON.parse(result.content[0].text)).toEqual({ gid: 'cf1' })
	})

	it('enum option tools map create, insert, and update', async () => {
		const createEnumOption = vi.fn().mockResolvedValue({ gid: 'o1' })
		const insertEnumOption = vi.fn().mockResolvedValue({ gid: 'o1' })
		const updateEnumOption = vi.fn().mockResolvedValue({ gid: 'o1' })
		const server = setup({ createEnumOption, insertEnumOption, updateEnumOption })

		await server.handlers.get('asana_custom_field_enum_option_create')?.({
			custom_field_gid: 'cf1',
			name: 'S2',
			insert_after: 'o0',
		})
		await server.handlers.get('asana_custom_field_enum_option_insert')?.({
			custom_field_gid: 'cf1',
			enum_option_gid: 'o1',
			before_enum_option_gid: 'o0',
		})
		await server.handlers.get('asana_custom_field_enum_option_update')?.({ enum_option_gid: 'o1', enabled: false })

		expect(createEnumOption).toHaveBeenCalledWith('cf1', { name: 'S2', insertAfter: 'o0' }, undefined)
		expect(insertEnumOption).toHaveBeenCalledWith('cf1', { enumOption: 'o1', beforeEnumOption: 'o0' })
		expect(updateEnumOption).toHaveBeenCalledWith('o1', { enabled: false }, undefined)
	})

	it('asana_custom_field_update maps snake_case params to the api and rejects an empty change set', async () => {
		const updateCustomField = vi.fn().mockResolvedValue({ gid: 'cf1' })
		const server = setup({ updateCustomField })

		await server.handlers.get('asana_custom_field_update')?.({
			custom_field_gid: 'cf1',
			name: 'Cost',
			currency_code: 'USD',
			enabled: false,
		})
		expect(updateCustomField).toHaveBeenCalledWith(
			'cf1',
			{ name: 'Cost', currencyCode: 'USD', enabled: false },
			undefined,
		)

		await expect(server.handlers.get('asana_custom_field_update')?.({ custom_field_gid: 'cf1' })).rejects.toThrow(
			'Nothing to update',
		)
	})

	it('asana_custom_field_delete deletes idempotently and reports already_absent for a missing field', async () => {
		const deleteCustomField = vi
			.fn()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce({ response: { status: 404, body: { errors: [{ message: 'Not Found' }] } } })
		const server = setup({ deleteCustomField })

		const first = await server.handlers.get('asana_custom_field_delete')?.({ custom_field_gid: 'cf1' })
		const second = await server.handlers.get('asana_custom_field_delete')?.({ custom_field_gid: 'cf1' })

		expect(JSON.parse(first.content[0].text)).toMatchObject({ deleted: true, gid: 'cf1', already_absent: false })
		expect(JSON.parse(second.content[0].text)).toMatchObject({ deleted: true, gid: 'cf1', already_absent: true })
	})

	it('portfolio attach and detach tools return the idempotent status', async () => {
		const attachCustomFieldToPortfolio = vi.fn().mockResolvedValue({ status: 'attached' })
		const detachCustomFieldFromPortfolio = vi.fn().mockResolvedValue({ status: 'already_detached' })
		const server = setup({ attachCustomFieldToPortfolio, detachCustomFieldFromPortfolio })

		await server.handlers.get('asana_custom_field_attach_portfolio')?.({
			portfolio_gid: 'pf1',
			custom_field_gid: 'cf1',
			is_important: true,
		})
		const detached = await server.handlers.get('asana_custom_field_detach_portfolio')?.({
			portfolio_gid: 'pf1',
			custom_field_gid: 'cf1',
		})

		expect(attachCustomFieldToPortfolio).toHaveBeenCalledWith('pf1', 'cf1', { isImportant: true })
		expect(detachCustomFieldFromPortfolio).toHaveBeenCalledWith('pf1', 'cf1')
		expect(JSON.parse(detached.content[0].text).status).toBe('already_detached')
	})

	it('attach tools pass insert_before and insert_after through', async () => {
		const attachCustomField = vi.fn().mockResolvedValue({ status: 'attached' })
		const attachCustomFieldToPortfolio = vi.fn().mockResolvedValue({ status: 'attached' })
		const server = setup({ attachCustomField, attachCustomFieldToPortfolio })

		await server.handlers.get('asana_custom_field_attach')?.({
			project_gid: 'p1',
			custom_field_gid: 'cf1',
			insert_before: 's1',
		})
		await server.handlers.get('asana_custom_field_attach_portfolio')?.({
			portfolio_gid: 'pf1',
			custom_field_gid: 'cf1',
			insert_after: 's2',
		})

		expect(attachCustomField).toHaveBeenCalledWith('p1', 'cf1', { insertBefore: 's1' })
		expect(attachCustomFieldToPortfolio).toHaveBeenCalledWith('pf1', 'cf1', { insertAfter: 's2' })
	})

	it('attach and detach tools return the idempotent status', async () => {
		const attachCustomField = vi.fn().mockResolvedValue({ status: 'attached' })
		const detachCustomField = vi.fn().mockResolvedValue({ status: 'already_detached' })
		const server = setup({ attachCustomField, detachCustomField })

		await server.handlers.get('asana_custom_field_attach')?.({
			project_gid: 'p1',
			custom_field_gid: 'cf1',
			is_important: true,
		})
		const detached = await server.handlers.get('asana_custom_field_detach')?.({
			project_gid: 'p1',
			custom_field_gid: 'cf1',
		})

		expect(attachCustomField).toHaveBeenCalledWith('p1', 'cf1', { isImportant: true })
		expect(detachCustomField).toHaveBeenCalledWith('p1', 'cf1')
		expect(JSON.parse(detached.content[0].text).status).toBe('already_detached')
	})
})
