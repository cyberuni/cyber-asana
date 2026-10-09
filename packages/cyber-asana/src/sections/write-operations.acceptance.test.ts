import { describe, vi } from 'vitest'
import { createSectionApi } from './api.js'
import type { SectionGateway } from './gateway.js'
import { defineSectionWriteAcceptanceSpecs } from './write-operations.acceptance.js'

function createWritableGateway(): SectionGateway {
	const sections = new Map<string, Record<string, unknown>>()
	let next = 1
	return {
		listSections: vi.fn(),
		getSection: vi.fn(async (sectionGid: string) => {
			const section = sections.get(sectionGid)
			if (!section) throw new Error(`section not found: ${sectionGid}`)
			return section
		}),
		createSection: vi.fn(async (_projectGid: string, name: string) => {
			const gid = String(next++)
			sections.set(gid, { gid, name })
			return { gid, name }
		}),
		updateSection: vi.fn(),
		deleteSection: vi.fn(async (sectionGid: string) => {
			sections.delete(sectionGid)
		}),
		moveSection: vi.fn(),
		addTaskToSection: vi.fn(),
	} as unknown as SectionGateway
}

describe(
	'sections/write operations acceptance',
	defineSectionWriteAcceptanceSpecs({
		getApi: () => createSectionApi(createWritableGateway()),
		projectGid: '999',
	}),
)
