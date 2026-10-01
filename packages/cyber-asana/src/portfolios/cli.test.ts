import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createPortfolioMock = vi.fn()
const updatePortfolioMock = vi.fn()
const listPortfolioItemsMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createPortfolio: createPortfolioMock,
		updatePortfolio: updatePortfolioMock,
		listPortfolioItems: listPortfolioItemsMock,
	}
})

const { portfolioCommand } = await import('./cli.js')

describe('portfolios/cli', () => {
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	it('portfolio list applies a minimal default field set, a count summary, and next steps', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listPortfolios = vi.fn().mockResolvedValue([{ gid: 'pf1', name: 'Roadmap' }])
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios,
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listPortfolios).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'gid,name' }))
		const lines = logSpy.mock.calls.map((c) => String(c[0]))
		expect(lines).toContain('\n1 portfolio(s)')
		expect(lines.some((l) => l.includes('cyber-asana portfolio items <gid>'))).toBe(true)
		logSpy.mockRestore()
	})

	it('portfolio items applies a minimal default field set and a count summary', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		const listPortfolioItems = vi.fn().mockResolvedValue([{ gid: 'proj1', name: 'Website' }])
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios: vi.fn(),
				listPortfolioItems,
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'items', 'pf1'], { from: 'node' })

		expect(listPortfolioItems).toHaveBeenCalledWith('pf1', expect.objectContaining({ optFields: 'gid,name' }))
		expect(logSpy.mock.calls.map((c) => String(c[0]))).toContain('\n1 item(s)')
		logSpy.mockRestore()
	})

	it('portfolio list respects an explicit --opt-fields override', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listPortfolios = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios,
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'list', '--workspace-gid', 'ws1', '--opt-fields', 'name'], {
			from: 'node',
		})

		expect(listPortfolios).toHaveBeenCalledWith('ws1', expect.objectContaining({ optFields: 'name' }))
		vi.restoreAllMocks()
	})

	it('portfolio delete emits a structured acknowledgement with --json', async () => {
		const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
		process.argv = ['node', 'test', '--json']
		const program = new Command().option('--json').addCommand(
			portfolioCommand({
				listPortfolios: vi.fn(),
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn().mockResolvedValue(undefined),
			}),
		)

		await program.parseAsync(['node', 'test', '--json', 'portfolio', 'delete', 'pf1'], { from: 'node' })

		expect(logSpy).toHaveBeenCalledWith(
			JSON.stringify({ deleted: true, resource: 'portfolio', gid: 'pf1', already_absent: false }, null, 2),
		)
		logSpy.mockRestore()
	})

	it('portfolio create forwards workspace gid and name', async () => {
		createPortfolioMock.mockResolvedValue({ gid: 'pf1', name: 'Roadmap' })
		const program = new Command().addCommand(portfolioCommand())

		await program.parseAsync(['node', 'test', 'portfolio', 'create', 'Roadmap', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(createPortfolioMock).toHaveBeenCalledWith('ws1', 'Roadmap')
	})

	it('portfolio update forwards gid and fields', async () => {
		updatePortfolioMock.mockResolvedValue({ gid: 'pf1', name: 'Updated' })
		const program = new Command().addCommand(portfolioCommand())

		await program.parseAsync(['node', 'test', 'portfolio', 'update', 'pf1', '--name', 'Updated'], { from: 'node' })

		expect(updatePortfolioMock).toHaveBeenCalledWith('pf1', { name: 'Updated' })
	})

	it('portfolio items forwards portfolio gid and pagination options', async () => {
		listPortfolioItemsMock.mockResolvedValue({ data: [{ gid: 'proj1', name: 'Website' }], next_page: null, limit: 100 })
		const program = new Command().addCommand(portfolioCommand())

		await program.parseAsync(['node', 'test', 'portfolio', 'items', 'pf1', '--limit', '25'], { from: 'node' })

		expect(listPortfolioItemsMock).toHaveBeenCalledWith('pf1', { limit: 25, optFields: 'gid,name' })
	})

	it('portfolio command can use injected dependencies', async () => {
		const injectedCreatePortfolio = vi.fn().mockResolvedValue({ gid: 'pf1', name: 'Roadmap' })
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios: vi.fn(),
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: injectedCreatePortfolio,
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'create', 'Roadmap', '--workspace-gid', 'ws1'], {
			from: 'node',
		})

		expect(injectedCreatePortfolio).toHaveBeenCalledWith('ws1', 'Roadmap')
	})

	it('portfolio list forwards --owner-gid as an owner filter', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listPortfolios = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios,
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'list', '--workspace-gid', 'ws1', '--owner-gid', 'u1'], {
			from: 'node',
		})

		expect(listPortfolios).toHaveBeenCalledWith('ws1', expect.objectContaining({ owner: 'u1' }))
		vi.restoreAllMocks()
	})

	it('portfolio list forwards --custom-type', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listPortfolios = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios,
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'list', '--workspace-gid', 'ws1', '--custom-type', ''], {
			from: 'node',
		})

		expect(listPortfolios).toHaveBeenCalledWith('ws1', expect.objectContaining({ customType: '' }))
		vi.restoreAllMocks()
	})

	it('portfolio list accepts the legacy --owner alias', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listPortfolios = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios,
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'list', '--workspace-gid', 'ws1', '--owner', 'u1'], {
			from: 'node',
		})

		expect(listPortfolios).toHaveBeenCalledWith('ws1', expect.objectContaining({ owner: 'u1' }))
		vi.restoreAllMocks()
	})

	it('portfolio list omits the owner filter when no owner is given', async () => {
		vi.spyOn(console, 'log').mockImplementation(() => {})
		const listPortfolios = vi.fn().mockResolvedValue([])
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios,
				listPortfolioItems: vi.fn(),
				getPortfolio: vi.fn(),
				createPortfolio: vi.fn(),
				updatePortfolio: vi.fn(),
				deletePortfolio: vi.fn(),
			}),
		)

		await program.parseAsync(['node', 'test', 'portfolio', 'list', '--workspace-gid', 'ws1'], { from: 'node' })

		expect(listPortfolios.mock.calls[0]?.[1]).not.toHaveProperty('owner')
		vi.restoreAllMocks()
	})
})
