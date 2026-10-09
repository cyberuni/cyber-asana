import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SectionApi } from './api.js'

const createSectionMock = vi.fn()
const updateSectionMock = vi.fn()

vi.mock('./default.js', async () => {
	const actual = await vi.importActual<typeof import('./default.js')>('./default.js')
	return {
		...actual,
		createSection: createSectionMock,
		updateSection: updateSectionMock,
	}
})

const { registerSectionTools } = await import('./mcp.js')

type ToolHandler = (params: any) => Promise<any>

function apiDouble(overrides: Partial<SectionApi> = {}): SectionApi {
	return {
		listSections: vi.fn(),
		getSection: vi.fn(),
		createSection: vi.fn(),
		updateSection: vi.fn(),
		deleteSection: vi.fn(),
		moveSection: vi.fn(),
		addTaskToSection: vi.fn(),
		...overrides,
	} as SectionApi
}

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

		expect(createSectionMock).toHaveBeenCalledWith('proj1', 'In Progress', {
			insertBefore: undefined,
			insertAfter: undefined,
		})
	})

	it('asana_section_create forwards the placement it was given', async () => {
		const createSection = vi.fn().mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const server = createServer()
		registerSectionTools(server as any, apiDouble({ createSection }))

		await server.handlers.get('asana_section_create')?.({
			project_gid: 'proj1',
			name: 'In Progress',
			insert_after: 'sec2',
		})

		expect(createSection).toHaveBeenCalledWith('proj1', 'In Progress', {
			insertBefore: undefined,
			insertAfter: 'sec2',
		})
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
		registerSectionTools(server as any, apiDouble({ createSection: injectedCreateSection }))

		await server.handlers.get('asana_section_create')?.({
			project_gid: 'proj1',
			name: 'In Progress',
		})

		expect(injectedCreateSection).toHaveBeenCalledWith('proj1', 'In Progress', {
			insertBefore: undefined,
			insertAfter: undefined,
		})
	})

	it('asana_section_move forwards the project, section, and placement', async () => {
		const moveSection = vi.fn().mockResolvedValue(undefined)
		const server = createServer()
		registerSectionTools(server as any, apiDouble({ moveSection }))

		const result = await server.handlers.get('asana_section_move')?.({
			project_gid: 'proj1',
			section_gid: 'sec1',
			insert_before: 'sec2',
		})

		expect(moveSection).toHaveBeenCalledWith('proj1', 'sec1', { insertBefore: 'sec2', insertAfter: undefined })
		expect(result.content[0].text).toContain('sec1')
	})

	it('asana_section_task_add forwards the section, task, and placement', async () => {
		const addTaskToSection = vi.fn().mockResolvedValue(undefined)
		const server = createServer()
		registerSectionTools(server as any, apiDouble({ addTaskToSection }))

		const result = await server.handlers.get('asana_section_task_add')?.({
			section_gid: 'sec1',
			task_gid: 'task1',
			insert_after: 'task2',
		})

		expect(addTaskToSection).toHaveBeenCalledWith('sec1', 'task1', { insertAfter: 'task2', insertBefore: undefined })
		expect(result.content[0].text).toContain('task1')
	})
})
