import { describe, expect, it, vi } from 'vitest'
import { createSectionApi } from './api.js'
import type { SectionGateway } from './gateway.js'

const mockSection = { gid: 'sec1', name: 'In Progress' }

function gatewayDouble(overrides: Partial<SectionGateway> = {}): SectionGateway {
	return {
		listSections: vi.fn(),
		getSection: vi.fn(),
		createSection: vi.fn(),
		updateSection: vi.fn(),
		deleteSection: vi.fn(),
		moveSection: vi.fn(),
		addTaskToSection: vi.fn(),
		...overrides,
	}
}

describe('createSectionApi', () => {
	it('uses the provided gateway for listSections', async () => {
		const mockListSections = vi.fn().mockResolvedValue({ data: [mockSection], next_page: null, limit: 100 })
		const api = createSectionApi(gatewayDouble({ listSections: mockListSections }))

		const result = await api.listSections('proj1')

		expect(result).toEqual({ data: [mockSection], next_page: null, limit: 100 })
		expect(mockListSections).toHaveBeenCalledWith('proj1', undefined)
	})

	it('uses the provided gateway for createSection, placement included', async () => {
		const createSection = vi.fn().mockResolvedValue(mockSection)
		const api = createSectionApi(gatewayDouble({ createSection }))

		await api.createSection('proj1', 'In Progress', { insertAfter: 'sec2' })

		expect(createSection).toHaveBeenCalledWith('proj1', 'In Progress', { insertAfter: 'sec2' }, undefined)
	})

	it('uses the provided gateway for moveSection', async () => {
		const moveSection = vi.fn().mockResolvedValue(undefined)
		const api = createSectionApi(gatewayDouble({ moveSection }))

		await api.moveSection('proj1', 'sec1', { insertBefore: 'sec2' })

		expect(moveSection).toHaveBeenCalledWith('proj1', 'sec1', { insertBefore: 'sec2' })
	})

	it('uses the provided gateway for addTaskToSection', async () => {
		const addTaskToSection = vi.fn().mockResolvedValue(undefined)
		const api = createSectionApi(gatewayDouble({ addTaskToSection }))

		await api.addTaskToSection('sec1', 'task1', { insertAfter: 'task2' })

		expect(addTaskToSection).toHaveBeenCalledWith('sec1', 'task1', { insertAfter: 'task2' })
	})
})
