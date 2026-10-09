import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { buildErrorBody } from './error-body.js'

export function formatMcpToolError(error: unknown): CallToolResult {
	return {
		isError: true,
		content: [{ type: 'text', text: JSON.stringify(buildErrorBody(error)) }],
	}
}

function wrapToolCallback<T extends (...args: never[]) => unknown>(callback: T): T {
	return (async (...args: Parameters<T>) => {
		try {
			return await callback(...args)
		} catch (error) {
			return formatMcpToolError(error)
		}
	}) as T
}

export function withMcpErrorHandling(server: McpServer): McpServer {
	const originalTool = server.tool.bind(server)
	server.tool = ((name: string, ...rest: unknown[]) => {
		const callback = rest.at(-1)
		if (typeof callback === 'function') {
			rest[rest.length - 1] = wrapToolCallback(callback as (...args: never[]) => unknown)
		}
		return originalTool(name, ...(rest as Parameters<typeof originalTool> extends [string, ...infer R] ? R : never))
	}) as typeof server.tool
	return server
}
