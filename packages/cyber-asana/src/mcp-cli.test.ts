import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'

const startMcpServerMock = vi.fn()

vi.mock('./mcp-server.js', () => ({
	startMcpServer: startMcpServerMock,
}))

const { mcpCommand } = await import('./mcp-cli.js')

describe('mcp-cli', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('mcp starts the stdio MCP server', async () => {
		startMcpServerMock.mockResolvedValue(undefined)
		const getContext = vi.fn()
		const program = new Command().addCommand(mcpCommand(getContext))

		await program.parseAsync(['node', 'test', 'mcp'], { from: 'node' })

		expect(startMcpServerMock).toHaveBeenCalledWith(getContext)
	})
})
