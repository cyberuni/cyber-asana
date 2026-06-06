import { afterEach, describe, expect, it, vi } from 'vitest'

const createSectionMock = vi.fn()
const updateSectionMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createSection: createSectionMock,
		updateSection: updateSectionMock,
	}
})

const { registerSectionTools } = await import('./mcp.js')

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

describe('sections/mcp', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('asana_section_create forwards project gid and name', async () => {
		createSectionMock.mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const server = createServer()
		registerSectionTools(server as any)

		await server.handlers.get('asana_section_create')?.({
			project_gid: 'proj1',
			name: 'In Progress',
		})

		expect(createSectionMock).toHaveBeenCalledWith('proj1', 'In Progress')
	})

	it('asana_section_update forwards gid and new name', async () => {
		updateSectionMock.mockResolvedValue({ gid: 'sec1', name: 'Done' })
		const server = createServer()
		registerSectionTools(server as any)

		await server.handlers.get('asana_section_update')?.({
			section_gid: 'sec1',
			name: 'Done',
		})

		expect(updateSectionMock).toHaveBeenCalledWith('sec1', 'Done')
	})

	it('section tools can use injected dependencies', async () => {
		const injectedCreateSection = vi.fn().mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const server = createServer()
		registerSectionTools(server as any, {
			listSections: vi.fn(),
			getSection: vi.fn(),
			createSection: injectedCreateSection,
			updateSection: vi.fn(),
			deleteSection: vi.fn(),
		})

		await server.handlers.get('asana_section_create')?.({
			project_gid: 'proj1',
			name: 'In Progress',
		})

		expect(injectedCreateSection).toHaveBeenCalledWith('proj1', 'In Progress')
	})
})
