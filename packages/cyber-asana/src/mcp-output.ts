import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { encodeToon } from './toon.js'

// Token-efficient MCP output — principle 1, applied at the registration layer so
// every tool benefits without touching individual call sites. Opt-in via
// CYBER_ASANA_MCP_FORMAT=toon so the default JSON contract is preserved.

export type McpOutputFormat = 'json' | 'toon'

export function mcpOutputFormat(env: NodeJS.ProcessEnv = process.env): McpOutputFormat {
	return env.CYBER_ASANA_MCP_FORMAT?.toLowerCase() === 'toon' ? 'toon' : 'json'
}

export function reencodeToolResult(result: CallToolResult, format: McpOutputFormat): CallToolResult {
	if (format !== 'toon' || !Array.isArray(result.content)) return result
	return {
		...result,
		content: result.content.map((part) => {
			if (part.type !== 'text') return part
			let parsed: unknown
			try {
				parsed = JSON.parse(part.text)
			} catch {
				return part
			}
			return { ...part, text: encodeToon(parsed) }
		}),
	}
}

function wrapToolCallback<T extends (...args: never[]) => unknown>(callback: T, env: NodeJS.ProcessEnv): T {
	return (async (...args: Parameters<T>) => {
		const result = (await callback(...args)) as CallToolResult
		return reencodeToolResult(result, mcpOutputFormat(env))
	}) as T
}

export function withMcpOutputFormat(server: McpServer, env: NodeJS.ProcessEnv = process.env): McpServer {
	const originalTool = server.tool.bind(server)
	server.tool = ((name: string, ...rest: unknown[]) => {
		const callback = rest.at(-1)
		if (typeof callback === 'function') {
			rest[rest.length - 1] = wrapToolCallback(callback as (...args: never[]) => unknown, env)
		}
		return originalTool(name, ...(rest as Parameters<typeof originalTool> extends [string, ...infer R] ? R : never))
	}) as typeof server.tool
	return server
}
