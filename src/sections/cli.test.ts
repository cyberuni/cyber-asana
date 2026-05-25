import { Command } from 'commander'
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

const { sectionCommand } = await import('./cli.js')

describe('sections/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('section create forwards project gid and name', async () => {
		createSectionMock.mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const program = new Command().addCommand(sectionCommand())

		await program.parseAsync(['node', 'test', 'section', 'create', 'In Progress', '--project-gid', 'proj1'], {
			from: 'node',
		})

		expect(createSectionMock).toHaveBeenCalledWith('proj1', 'In Progress')
	})

	it('section update forwards gid and new name', async () => {
		updateSectionMock.mockResolvedValue({ gid: 'sec1', name: 'Done' })
		const program = new Command().addCommand(sectionCommand())

		await program.parseAsync(['node', 'test', 'section', 'update', 'sec1', '--name', 'Done'], { from: 'node' })

		expect(updateSectionMock).toHaveBeenCalledWith('sec1', 'Done')
	})

	it('section command can use injected dependencies', async () => {
		const injectedCreateSection = vi.fn().mockResolvedValue({ gid: 'sec1', name: 'In Progress' })
		const program = new Command().addCommand(
			sectionCommand({
				listSections: vi.fn(),
				getSection: vi.fn(),
				createSection: injectedCreateSection,
				updateSection: vi.fn(),
				deleteSection: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'section', 'create', 'In Progress', '--project-gid', 'proj1'], {
			from: 'node',
		})

		expect(injectedCreateSection).toHaveBeenCalledWith('proj1', 'In Progress')
	})
})
