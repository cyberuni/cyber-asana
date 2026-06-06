import { Command } from 'commander'
import type { RuntimeContext } from './composition.js'
import { startMcpServer } from './mcp-server.js'

export function mcpCommand(getContext: () => RuntimeContext) {
	return new Command('mcp').description('Run the stdio MCP server').action(async () => {
		await startMcpServer(getContext)
	})
}
