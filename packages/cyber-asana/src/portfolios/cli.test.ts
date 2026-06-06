import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createPortfolioMock = vi.fn()
const updatePortfolioMock = vi.fn()

vi.mock('./api.js', async () => {
	const actual = await vi.importActual<typeof import('./api.js')>('./api.js')
	return {
		...actual,
		createPortfolio: createPortfolioMock,
		updatePortfolio: updatePortfolioMock,
	}
})

const { portfolioCommand } = await import('./cli.js')

describe('portfolios/cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
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

	it('portfolio command can use injected dependencies', async () => {
		const injectedCreatePortfolio = vi.fn().mockResolvedValue({ gid: 'pf1', name: 'Roadmap' })
		const program = new Command().addCommand(
			portfolioCommand({
				listPortfolios: vi.fn(),
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
})
