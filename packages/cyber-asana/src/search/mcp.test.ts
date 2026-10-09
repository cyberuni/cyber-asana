import { afterEach, describe, expect, it, vi } from 'vitest'

const searchObjectsMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		searchObjects: searchObjectsMock,
	}
})

const { registerSearchTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function createServer() {
	const handlers = new Map<string, ToolHandler>()
	const descriptions = new Map<string, string>()
	const schemas = new Map<string, any>()
	return {
		handlers,
		descriptions,
		schemas,
		tool(name: string, description: string, schema: any, handler: ToolHandler) {
			handlers.set(name, handler)
			descriptions.set(name, description)
			schemas.set(name, schema)
		},
	}
}

describe('search/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_search_objects forwards workspace gid, resource type, query, and count', async () => {
		searchObjectsMock.mockResolvedValue([{ gid: 'proj1', name: 'Website Redesign', resource_type: 'project' }])
		const server = createServer()
		registerSearchTools(server as any)

		const result = await server.handlers.get('asana_search_objects')?.({
			workspace_gid: 'ws1',
			resource_type: 'project',
			query: 'website',
			count: 5,
			opt_fields: 'gid,name',
		})

		expect(searchObjectsMock).toHaveBeenCalledWith('ws1', 'project', {
			query: 'website',
			count: 5,
			optFields: 'gid,name',
		})
		expect(result).toEqual({
			content: [
				{ type: 'text', text: JSON.stringify([{ gid: 'proj1', name: 'Website Redesign', resource_type: 'project' }]) },
			],
		})
	})

	it('asana_search_objects applies a minimal default field set', async () => {
		searchObjectsMock.mockResolvedValue([])
		const server = createServer()
		registerSearchTools(server as any)

		await server.handlers.get('asana_search_objects')?.({ workspace_gid: 'ws1', resource_type: 'user' })

		expect(searchObjectsMock).toHaveBeenCalledWith('ws1', 'user', {
			query: undefined,
			count: undefined,
			optFields: 'gid,name,resource_type',
		})
	})

	it('asana_search_objects tells the caller results are capped and not exhaustive', () => {
		const server = createServer()
		registerSearchTools(server as any)

		expect(server.descriptions.get('asana_search_objects')).toMatch(/not exhaustive/i)
		expect(server.descriptions.get('asana_search_objects')).toMatch(/one resource type per call/i)
	})

	it('asana_search_objects does not expose pagination parameters it cannot honour', () => {
		const server = createServer()
		registerSearchTools(server as any)

		const schema = server.schemas.get('asana_search_objects')
		expect(Object.keys(schema)).toEqual(['workspace_gid', 'resource_type', 'query', 'count', 'opt_fields'])
	})

	it('asana_search_objects constrains resource_type to the types the endpoint accepts', () => {
		const server = createServer()
		registerSearchTools(server as any)

		const schema = server.schemas.get('asana_search_objects')
		expect(schema.resource_type.safeParse('project').success).toBe(true)
		expect(schema.resource_type.safeParse('workspace').success).toBe(false)
	})

	it('search tools can use injected dependencies', async () => {
		const injectedSearchObjects = vi.fn().mockResolvedValue([])
		const server = createServer()
		registerSearchTools(server as any, { searchObjects: injectedSearchObjects })

		await server.handlers.get('asana_search_objects')?.({ workspace_gid: 'ws1', resource_type: 'team' })

		expect(injectedSearchObjects).toHaveBeenCalled()
	})
})
