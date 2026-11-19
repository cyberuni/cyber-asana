import Asana from 'asana'
import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPortfolioApi } from './api.js'
import { portfolioCommand } from './cli.js'
import { createAsanaPortfolioGateway, type PortfolioGateway } from './gateway.js'
import { registerPortfolioTools } from './mcp.js'

// The remaining createPortfolio / updatePortfolio parameters: gateway to SDK, CLI and MCP to api, and local validation.

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

function fakeGateway() {
	return {
		createPortfolio: vi.fn().mockResolvedValue({ gid: '1' }),
		updatePortfolio: vi.fn().mockResolvedValue({ gid: '1' }),
	} as unknown as PortfolioGateway & {
		createPortfolio: ReturnType<typeof vi.fn>
		updatePortfolio: ReturnType<typeof vi.fn>
	}
}

const createFields = {
	archived: true,
	color: 'dark-pink',
	custom_type: 'ct1',
	resource_subtype: 'custom',
	default_access_level: 'viewer',
	public: true,
	due_on: '2026-12-31',
	start_on: '2026-01-01',
} as const

describe('portfolio write parameters', () => {
	afterEach(() => vi.restoreAllMocks())

	it('gateway create sends every field under Asana name', async () => {
		const spy = vi
			.spyOn(Asana.PortfoliosApi.prototype, 'createPortfolio')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		await createAsanaPortfolioGateway({} as Asana.ApiClient).createPortfolio('ws1', 'Roadmap', undefined, createFields)
		expect(spy).toHaveBeenCalledWith(...[{ data: { name: 'Roadmap', workspace: 'ws1', ...createFields } }, {}])
	})

	it('gateway update sends every field under Asana name', async () => {
		const spy = vi
			.spyOn(Asana.PortfoliosApi.prototype, 'updatePortfolio')
			.mockResolvedValue({ data: { gid: '1' } } as never)
		const fields = { ...createFields, custom_fields: { c1: 'x' }, html_custom_fields: { c2: '<body>y</body>' } }
		await createAsanaPortfolioGateway({} as Asana.ApiClient).updatePortfolio('pf1', fields)
		expect(spy).toHaveBeenCalledWith(...[{ data: fields }, 'pf1', {}])
	})

	it('api create forwards fields to the gateway', async () => {
		const gateway = fakeGateway()
		await createPortfolioApi(gateway).createPortfolio('ws1', 'Roadmap', undefined, createFields)
		expect(gateway.createPortfolio).toHaveBeenCalledWith('ws1', 'Roadmap', undefined, createFields)
	})

	it.each([
		['create', (api: any) => api.createPortfolio('ws1', 'R', undefined, { color: 'mauve' })],
		['update', (api: any) => api.updatePortfolio('pf1', { color: 'mauve' })],
	])('api %s rejects an unknown color', async (_n, call) => {
		await expect(call(createPortfolioApi(fakeGateway()))).rejects.toThrow(/color must be one of/)
	})

	it('api rejects an unknown resource_subtype and default_access_level', async () => {
		const api = createPortfolioApi(fakeGateway())
		await expect(api.updatePortfolio('pf1', { resource_subtype: 'x' as never })).rejects.toThrow(
			/resource_subtype must be/,
		)
		await expect(api.updatePortfolio('pf1', { default_access_level: 'owner' as never })).rejects.toThrow(
			/default_access_level must be/,
		)
	})

	it('api rejects a malformed date', async () => {
		const api = createPortfolioApi(fakeGateway())
		await expect(api.updatePortfolio('pf1', { due_on: '2026-13-40' })).rejects.toThrow(/due_on must be a date/)
		await expect(api.createPortfolio('ws1', 'R', undefined, { due_on: '2026-02-30' })).rejects.toThrow(
			/due_on must be a date/,
		)
	})

	it('api rejects start_on without due_on', async () => {
		const gateway = fakeGateway()
		await expect(createPortfolioApi(gateway).updatePortfolio('pf1', { start_on: '2026-01-01' })).rejects.toThrow(
			/start_on needs due_on/,
		)
		expect(gateway.updatePortfolio).not.toHaveBeenCalled()
	})

	it('api rejects start_on after due_on', async () => {
		await expect(
			createPortfolioApi(fakeGateway()).createPortfolio('ws1', 'R', undefined, {
				start_on: '2026-12-31',
				due_on: '2026-01-01',
			}),
		).rejects.toThrow(/start_on must not be after due_on/)
	})

	it('portfolio create flags reach the api', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { createPortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }
		await new Command()
			.addCommand(portfolioCommand(api as never))
			.parseAsync([
				'node',
				'cli',
				'portfolio',
				'create',
				'Roadmap',
				'--workspace-gid',
				'ws1',
				'--archived',
				'--color',
				'dark-pink',
				'--custom-type',
				'ct1',
				'--resource-subtype',
				'custom',
				'--default-access-level',
				'viewer',
				'--public',
				'--due-on',
				'2026-12-31',
				'--start-on',
				'2026-01-01',
			])
		expect(api.createPortfolio).toHaveBeenCalledWith('ws1', 'Roadmap', undefined, createFields)
	})

	it('portfolio update flags reach the api, including --no-archived and --no-public', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const api = { updatePortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }
		const run = (...args: string[]) =>
			new Command()
				.addCommand(portfolioCommand(api as never))
				.parseAsync(['node', 'cli', 'portfolio', 'update', 'pf1', ...args])
		await run(
			'--archived',
			'--color',
			'dark-pink',
			'--custom-type',
			'ct1',
			'--resource-subtype',
			'custom',
			'--default-access-level',
			'viewer',
			'--public',
			'--due-on',
			'2026-12-31',
			'--start-on',
			'2026-01-01',
			'--custom-fields-json',
			'{"c1":"x"}',
			'--custom-field',
			'c3=z',
			'--html-custom-fields-json',
			'{"c2":"<body>y</body>"}',
			'--html-custom-field',
			'c4=<body>w</body>',
		)
		expect(api.updatePortfolio).toHaveBeenLastCalledWith(
			'pf1',
			{
				...createFields,
				custom_fields: { c1: 'x', c3: 'z' },
				html_custom_fields: { c2: '<body>y</body>', c4: '<body>w</body>' },
			},
			undefined,
		)
		await run('--no-archived', '--no-public')
		expect(api.updatePortfolio).toHaveBeenLastCalledWith('pf1', { archived: false, public: false }, undefined)
	})

	it('portfolio update rejects an unknown color at the CLI', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
		const api = { updatePortfolio: vi.fn() }
		const cmd = portfolioCommand(api as never)
		cmd.exitOverride()
		for (const c of cmd.commands) c.exitOverride()
		await expect(
			new Command().addCommand(cmd).parseAsync(['node', 'cli', 'portfolio', 'update', 'pf1', '--color', 'mauve']),
		).rejects.toThrow()
		expect(api.updatePortfolio).not.toHaveBeenCalled()
	})

	it('asana_portfolio_create fields reach the api', async () => {
		const api = { createPortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerPortfolioTools(server as never, api as never)
		await server.handlers.get('asana_portfolio_create')?.({ workspace_gid: 'ws1', name: 'Roadmap', ...createFields })
		expect(api.createPortfolio).toHaveBeenCalledWith('ws1', 'Roadmap', undefined, createFields)
	})

	it('asana_portfolio_update fields reach the api', async () => {
		const api = { updatePortfolio: vi.fn().mockResolvedValue({ gid: '1' }) }
		const server = createServer()
		registerPortfolioTools(server as never, api as never)
		await server.handlers.get('asana_portfolio_update')?.({
			portfolio_gid: 'pf1',
			...createFields,
			custom_fields: { c1: 'x' },
			html_custom_fields: { c2: '<body>y</body>' },
		})
		expect(api.updatePortfolio).toHaveBeenCalledWith(
			'pf1',
			{ ...createFields, custom_fields: { c1: 'x' }, html_custom_fields: { c2: '<body>y</body>' } },
			undefined,
		)
	})
})
