import { afterEach, describe, expect, it, vi } from 'vitest'

const triggerRuleMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return { ...actual, triggerRule: triggerRuleMock }
})

const { registerRuleTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const descriptions = new Map<string, string>()
	const handlers = new Map<string, ToolHandler>()
	return {
		descriptions,
		handlers,
		tool(name: string, description: string, _schema: unknown, handler: ToolHandler) {
			descriptions.set(name, description)
			handlers.set(name, handler)
		},
	}
}

describe('rules/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_rule_trigger forwards the trigger gid, resource, and action data', async () => {
		triggerRuleMock.mockResolvedValue({ triggered: true, rule_trigger_gid: 'rt1', resource: 'task1' })
		const server = createServer()
		registerRuleTools(server as any)

		await server.handlers.get('asana_rule_trigger')?.({
			rule_trigger_gid: 'rt1',
			resource: 'task1',
			action_data: { deploy: 'v2' },
		})

		expect(triggerRuleMock).toHaveBeenCalledWith('rt1', { resource: 'task1', action_data: { deploy: 'v2' } })
	})

	it('asana_rule_trigger omits absent optional fields from the request body', async () => {
		triggerRuleMock.mockResolvedValue({ triggered: true, rule_trigger_gid: 'rt1' })
		const server = createServer()
		registerRuleTools(server as any)

		await server.handlers.get('asana_rule_trigger')?.({ rule_trigger_gid: 'rt1' })

		expect(triggerRuleMock).toHaveBeenCalledWith('rt1', {})
	})

	it('asana_rule_trigger serializes the acknowledgement as JSON', async () => {
		const ack = { triggered: true, rule_trigger_gid: 'rt1', resource: 'task1' }
		triggerRuleMock.mockResolvedValue(ack)
		const server = createServer()
		registerRuleTools(server as any)

		const result = await server.handlers.get('asana_rule_trigger')?.({ rule_trigger_gid: 'rt1', resource: 'task1' })

		expect(JSON.parse(result.content[0].text)).toEqual(ack)
	})

	it('asana_rule_trigger describes where the trigger gid comes from and its limits', () => {
		const server = createServer()
		registerRuleTools(server as any)

		const description = server.descriptions.get('asana_rule_trigger') ?? ''
		expect(description).toContain('incoming web request')
		expect(description).toContain('Asana UI')
		expect(description).toContain('beta')
		expect(description).toContain('402')
	})

	it('registerRuleTools can use an injected api', async () => {
		const triggerRule = vi.fn().mockResolvedValue({ triggered: true, rule_trigger_gid: 'rt1' })
		const server = createServer()
		registerRuleTools(server as any, { triggerRule })

		await server.handlers.get('asana_rule_trigger')?.({ rule_trigger_gid: 'rt1' })

		expect(triggerRule).toHaveBeenCalledWith('rt1', {})
		expect(triggerRuleMock).not.toHaveBeenCalled()
	})
})
