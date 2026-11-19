import { Command } from 'commander'
import { type Mock, vi } from 'vitest'

type Fn = Mock

/** An api whose every method is a spy resolving to a generic resource. */
export function stubApi(): { api: never; fns: Record<string, Mock> } {
	const fns: Record<string, Fn> = {}
	const api = new Proxy({} as Record<string, Fn>, {
		get: (_t, key: string) => {
			fns[key] ??= vi.fn().mockResolvedValue({ gid: 'g1', name: 'n', start_date: '2026-01-01', end_date: '2026-01-02' })
			return fns[key]
		},
	})
	return { api: api as never, fns }
}

export async function runCli(command: Command, args: string[]) {
	const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
	try {
		await new Command()
			.exitOverride()
			.addCommand(command)
			.parseAsync(['node', 'test', ...args], { from: 'node' })
	} finally {
		spy.mockRestore()
	}
}

export function mcpServer(): {
	handlers: Map<string, (params: any) => Promise<any>>
	tool: (name: string, d: string, s: unknown, h: (params: any) => Promise<any>) => void
} {
	const handlers = new Map<string, (params: any) => Promise<any>>()
	return {
		handlers,
		tool: (name: string, _d: string, _s: unknown, h: (params: any) => Promise<any>) => void handlers.set(name, h),
	}
}

/** The last argument of the first call. */
export const lastArg = (spy: Fn) => spy.mock.calls[0]?.at(-1)
