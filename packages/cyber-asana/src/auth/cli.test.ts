import { Command } from 'commander'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authCommand } from './cli.js'
import { resolveCredential } from './credential.js'
import { resolveAppCredentials } from './settings.js'

describe('auth/cli', () => {
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	async function runStatus(credential: unknown, argv: string[] = ['node', 'test', '--json']) {
		const program = new Command().addCommand(authCommand({ readCredential: () => credential as never }))
		process.argv = argv
		await program.parseAsync(['node', 'test', 'auth', 'status'], { from: 'node' })
		return logSpy.mock.calls.map((call) => String(call[0])).join('\n')
	}

	it('reports stored OAuth credentials, including the account and expiry', async () => {
		const program = new Command().addCommand(
			authCommand({
				readCredential: (input?: { stored?: unknown }) =>
					resolveCredential({ env: {}, stored: input?.stored as never }),
				readStoredCredential: async () => ({
					accessToken: 'stored-token',
					expiresAt: Date.parse('2026-08-04T12:00:00.000Z'),
					user: { gid: '1201', name: 'Homa Wong', email: 'homa@example.com' },
				}),
			} as never),
		)
		process.argv = ['node', 'test']
		await program.parseAsync(['node', 'test', 'auth', 'status'], { from: 'node' })

		const out = logSpy.mock.calls.map((call) => String(call[0])).join('\n')
		expect(out).toContain('credentials.json')
		expect(out).toContain('Homa Wong')
		expect(out).toContain('2026-08-04')
	})

	// "not authenticated" when the variable *is* set reads as a broken token. Say
	// that the host forwarded the reference text, which is the actual cause.
	it('explains an unexpanded reference when nothing authenticated', async () => {
		const out = await runStatus({ authenticated: false, shadowed: [], unexpanded: ['ASANA_ACCESS_TOKEN'] }, [
			'node',
			'test',
		])
		expect(out).toContain('ASANA_ACCESS_TOKEN')
		expect(out).toMatch(/unexpanded|not expanded/i)
	})

	it('reports an unexpanded reference in JSON output', async () => {
		const out = await runStatus({ authenticated: false, shadowed: [], unexpanded: ['ASANA_ACCESS_TOKEN'] })
		expect(JSON.parse(out).unexpanded).toEqual(['ASANA_ACCESS_TOKEN'])
	})

	it('still explains an unexpanded reference when another source authenticated', async () => {
		const out = await runStatus(
			{
				authenticated: true,
				source: 'credentials.json',
				token: 'stored-token',
				shadowed: [],
				unexpanded: ['ASANA_ACCESS_TOKEN'],
			},
			['node', 'test'],
		)
		expect(out).toContain('ASANA_ACCESS_TOKEN')
	})

	it('names the source the credential came from', async () => {
		const out = await runStatus({
			authenticated: true,
			source: 'ASANA_ACCESS_TOKEN',
			token: '1/120:abcdef',
			shadowed: [],
		})
		expect(out).toContain('"authenticated": true')
		expect(out).toContain('"source": "ASANA_ACCESS_TOKEN"')
	})

	it('masks the token instead of printing it', async () => {
		const out = await runStatus({
			authenticated: true,
			source: 'ASANA_ACCESS_TOKEN',
			token: '1/120:abcdef',
			shadowed: [],
		})
		expect(out).not.toContain('1/120:abcdef')
		expect(out).toContain('…cdef')
	})

	it('lists the sources being ignored', async () => {
		const out = await runStatus({
			authenticated: true,
			source: '--token',
			token: 'flag-token',
			shadowed: ['ASANA_ACCESS_TOKEN', 'credentials.json'],
		})
		expect(out).toContain('ASANA_ACCESS_TOKEN')
		expect(out).toContain('credentials.json')
	})

	it('reports an unauthenticated state as data rather than an error', async () => {
		const out = await runStatus({ authenticated: false, shadowed: [] })
		expect(out).toContain('"authenticated": false')
	})

	it('tells an unauthenticated user how to authenticate in text mode', async () => {
		const out = await runStatus({ authenticated: false, shadowed: [] }, ['node', 'test'])
		expect(out).toContain('ASANA_ACCESS_TOKEN')
	})

	// The app registration is what `auth login` will authorize with, and it
	// resolves from a different chain than the token — so `status` has to report
	// it separately or an MCP app's id standing in for an API app's stays
	// invisible until Asana rejects it.
	describe('app registration', () => {
		const app = {
			clientId: 'api-client-1234',
			clientSecret: 'secret',
			source: 'ASANA_API_CLIENT_ID',
			shadowed: [] as string[],
		}

		async function runAppStatus(
			overrides: Record<string, unknown> = {},
			argv = ['node', 'test', '--json'],
			args: string[] = [],
		) {
			const program = new Command().addCommand(
				authCommand({
					readCredential: () => ({ authenticated: false, shadowed: [] }),
					readStoredCredential: async () => undefined,
					configDir: () => '/tmp/cyber-asana-test',
					readSettings: async () => ({}),
					readAppCredentials: () => app,
					...overrides,
				} as never),
			)
			process.argv = argv
			await program.parseAsync(['node', 'test', 'auth', 'status', ...args], { from: 'node' })
			return logSpy.mock.calls.map((call) => String(call[0])).join('\n')
		}

		it('names the source the app registration came from', async () => {
			const out = await runAppStatus()

			expect(out).toContain('"source": "ASANA_API_CLIENT_ID"')
		})

		it('masks the client id instead of printing it', async () => {
			const out = await runAppStatus()

			expect(out).not.toContain('api-client-1234')
			expect(out).toContain('"client_id_masked": "…1234"')
		})

		it('never prints the client secret', async () => {
			const out = await runAppStatus()

			expect(out).not.toContain('secret')
		})

		it('reports no app registration as null rather than omitting it', async () => {
			const out = await runAppStatus({ readAppCredentials: () => undefined })

			expect(out).toContain('"app": null')
		})

		it('lists the app-registration sources being ignored', async () => {
			const out = await runAppStatus({
				readAppCredentials: () => ({ ...app, shadowed: ['ASANA_CLIENT_ID', 'settings.json'] }),
			})

			expect(out).toContain('"ASANA_CLIENT_ID"')
			expect(out).toContain('"settings.json"')
		})

		it('names the registration and its source in text mode', async () => {
			const out = await runAppStatus({}, ['node', 'test'])

			expect(out).toContain('…1234')
			expect(out).toContain('ASANA_API_CLIENT_ID')
		})

		it('names the shadowed registration in text mode, where the mix-up bites', async () => {
			const out = await runAppStatus({ readAppCredentials: () => ({ ...app, shadowed: ['ASANA_CLIENT_ID'] }) }, [
				'node',
				'test',
			])

			expect(out).toContain('ASANA_CLIENT_ID')
		})

		it('resolves the registration against the settings file in the config directory', async () => {
			const readSettings = vi.fn().mockResolvedValue({ client_id: 'file-id' })
			const readAppCredentials = vi.fn().mockReturnValue(app)

			await runAppStatus({ readSettings, readAppCredentials })

			expect(readSettings).toHaveBeenCalledWith('/tmp/cyber-asana-test')
			expect(readAppCredentials).toHaveBeenCalledWith({ settings: { client_id: 'file-id' }, overrides: {} })
		})

		// `login`, `token`, and `logout` all take the registration on the command
		// line. Without the same pair here, the one command that explains which
		// registration wins cannot see the one that would.
		it('forwards a registration named on the command line to the resolver', async () => {
			const readAppCredentials = vi.fn().mockReturnValue(app)

			await runAppStatus(
				{ readAppCredentials },
				['node', 'test', '--json'],
				['--client-id', 'flag-id', '--client-secret', 'flag-secret'],
			)

			expect(readAppCredentials).toHaveBeenCalledWith({
				settings: {},
				overrides: { clientId: 'flag-id', clientSecret: 'flag-secret' },
			})
		})

		it('names flags as the winning source when the registration comes from the command line', async () => {
			const out = await runAppStatus(
				{
					readSettings: async () => ({ client_id: 'file-id' }),
					readAppCredentials: ({ settings, overrides }: never) =>
						resolveAppCredentials({ settings, env: {}, overrides }),
				},
				['node', 'test', '--json'],
				['--client-id', 'flag-id-9876'],
			)

			expect(out).toContain('"source": "flags"')
			expect(out).toContain('"client_id_masked": "\u20269876"')
		})
	})
})

describe('auth login', () => {
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	const tokens = {
		accessToken: 'access-token',
		refreshToken: 'refresh-token',
		expiresAt: 3_600_000,
		user: { gid: '1201', name: 'Homa Wong', email: 'homa@example.com' },
	}

	function loginDeps(overrides: Record<string, unknown> = {}) {
		return {
			readCredential: () => ({ authenticated: false, shadowed: [] }),
			configDir: () => '/tmp/cyber-asana-test',
			readSettings: vi.fn().mockResolvedValue({ client_id: 'client-123', client_secret: 'secret-456' }),
			login: vi.fn().mockResolvedValue(tokens),
			writeCredentials: vi.fn().mockResolvedValue(undefined),
			...overrides,
		}
	}

	async function runLogin(deps: Record<string, unknown>, args: string[] = [], argv = ['node', 'test']) {
		const program = new Command().addCommand(authCommand(deps as never))
		process.argv = argv
		await program.parseAsync(['node', 'test', 'auth', 'login', ...args], { from: 'node' })
		return logSpy.mock.calls.map((call) => String(call[0])).join('\n')
	}

	it('stores the credentials and names the account that granted them', async () => {
		const deps = loginDeps()

		const out = await runLogin(deps)

		expect(deps.writeCredentials).toHaveBeenCalledWith('/tmp/cyber-asana-test', tokens)
		expect(out).toContain('Homa Wong')
	})

	it('never prints the token when it stored it', async () => {
		const out = await runLogin(loginDeps())

		expect(out).not.toContain('access-token')
	})

	it('prints the access token and stores nothing with --no-store', async () => {
		const deps = loginDeps()

		const out = await runLogin(deps, ['--no-store'])

		expect(deps.writeCredentials).not.toHaveBeenCalled()
		expect(out).toContain('access-token')
	})

	it('withholds the refresh token from --no-store output by default', async () => {
		const out = await runLogin(loginDeps(), ['--no-store'])

		expect(out).not.toContain('refresh-token')
	})

	it('includes the refresh token only when explicitly asked', async () => {
		const out = await runLogin(loginDeps(), ['--no-store', '--include-refresh-token'])

		expect(out).toContain('refresh-token')
	})

	it('does not store when asked for the refresh token, since that is a print-only request', async () => {
		const deps = loginDeps()

		const out = await runLogin(deps, ['--include-refresh-token'])

		expect(deps.writeCredentials).not.toHaveBeenCalled()
		expect(out).toContain('refresh-token')
	})

	it('prints nothing but the token with --raw', async () => {
		const out = await runLogin(loginDeps(), ['--no-store', '--raw'])

		expect(out.trim()).toBe('access-token')
	})

	it('runs the out-of-band flow when asked for manual authorization', async () => {
		const deps = loginDeps()

		await runLogin(deps, ['--manual'])

		expect(deps.login).toHaveBeenCalledWith(expect.objectContaining({ manual: true }))
	})

	it('passes an explicitly registered redirect URL through', async () => {
		const deps = loginDeps()

		await runLogin(deps, ['--redirect-uri', 'https://example.com/cb'])

		expect(deps.login).toHaveBeenCalledWith(expect.objectContaining({ redirectUri: 'https://example.com/cb' }))
	})

	it('derives the callback port from a registered redirect URL', async () => {
		const deps = loginDeps()

		await runLogin(deps, ['--redirect-uri', 'http://localhost:9999/cb'])

		expect(deps.login).toHaveBeenCalledWith(expect.objectContaining({ port: 9999 }))
	})

	it('accepts the app registration on the command line', async () => {
		const deps = loginDeps({ readSettings: vi.fn().mockResolvedValue({}) })

		await runLogin(deps, ['--client-id', 'flag-id', '--client-secret', 'flag-secret'])

		expect(deps.login).toHaveBeenCalledWith(
			expect.objectContaining({
				app: expect.objectContaining({ clientId: 'flag-id', clientSecret: 'flag-secret' }),
			}),
		)
	})

	it('explains how to register an app when no client id is configured', async () => {
		const deps = loginDeps({ readSettings: vi.fn().mockResolvedValue({}) })

		await expect(runLogin(deps, [], ['node', 'test'])).rejects.toThrow(/ASANA_API_CLIENT_ID/)
	})

	// An MCP app registers under the same documented env var names but its
	// tokens only reach Asana's hosted MCP server, so help that just says
	// "create an app" sends people to the wrong registration.
	it('says the registration must be an API app, not an MCP app', async () => {
		const deps = loginDeps({ readSettings: vi.fn().mockResolvedValue({}) })

		await expect(runLogin(deps, [], ['node', 'test'])).rejects.toThrow(/API app/)
		await expect(runLogin(deps, [], ['node', 'test'])).rejects.toThrow(/MCP app/)
	})

	it('names both app-registration variables in the --client-id help', () => {
		const help = authCommand()
			.commands.find((c) => c.name() === 'login')
			?.helpInformation()

		expect(help).toContain('ASANA_API_CLIENT_ID')
		expect(help).toContain('ASANA_CLIENT_ID')
	})

	it('passes the requested scopes through to the flow', async () => {
		const deps = loginDeps()

		await runLogin(deps, ['--scope', 'tasks:read,projects:read'])

		expect(deps.login).toHaveBeenCalledWith(expect.objectContaining({ scopes: ['tasks:read', 'projects:read'] }))
	})
})

describe('auth token', () => {
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	const NOW = 1_000_000

	function tokenDeps(overrides: Record<string, unknown> = {}) {
		return {
			configDir: () => '/tmp/cyber-asana-test',
			readSettings: vi.fn().mockResolvedValue({ client_id: 'client-123', client_secret: 'secret-456' }),
			readCredentials: vi.fn().mockResolvedValue({
				accessToken: 'stored-token',
				refreshToken: 'refresh-token',
				expiresAt: NOW + 600_000,
			}),
			writeCredentials: vi.fn().mockResolvedValue(undefined),
			refreshAccessToken: vi.fn().mockResolvedValue({
				accessToken: 'refreshed-token',
				refreshToken: 'refresh-token',
				expiresAt: NOW + 3_600_000,
			}),
			now: () => NOW,
			...overrides,
		}
	}

	async function runToken(deps: Record<string, unknown>, args: string[] = []) {
		const program = new Command().addCommand(authCommand(deps as never))
		process.argv = ['node', 'test']
		await program.parseAsync(['node', 'test', 'auth', 'token', ...args], { from: 'node' })
		return logSpy.mock.calls.map((call) => String(call[0])).join('\n')
	}

	it('prints the stored access token for shell substitution', async () => {
		const out = await runToken(tokenDeps())

		expect(out.trim()).toBe('stored-token')
	})

	it('leaves a token that is still valid alone', async () => {
		const deps = tokenDeps()

		await runToken(deps)

		expect(deps.refreshAccessToken).not.toHaveBeenCalled()
	})

	it('refreshes a token that is about to expire', async () => {
		const deps = tokenDeps({
			readCredentials: vi.fn().mockResolvedValue({
				accessToken: 'stale-token',
				refreshToken: 'refresh-token',
				expiresAt: NOW + 5_000,
			}),
		})

		const out = await runToken(deps)

		expect(deps.refreshAccessToken).toHaveBeenCalledWith(
			expect.objectContaining({ refreshToken: 'refresh-token', clientId: 'client-123' }),
			expect.anything(),
		)
		expect(out.trim()).toBe('refreshed-token')
	})

	it('persists the refreshed token so the next command does not refresh again', async () => {
		const deps = tokenDeps({
			readCredentials: vi.fn().mockResolvedValue({
				accessToken: 'stale-token',
				refreshToken: 'refresh-token',
				expiresAt: NOW + 5_000,
			}),
		})

		await runToken(deps)

		expect(deps.writeCredentials).toHaveBeenCalledWith(
			'/tmp/cyber-asana-test',
			expect.objectContaining({ accessToken: 'refreshed-token' }),
		)
	})

	it('refreshes with an app registration passed on the command line', async () => {
		const deps = tokenDeps({
			readSettings: vi.fn().mockResolvedValue({}),
			readCredentials: vi.fn().mockResolvedValue({
				accessToken: 'stale-token',
				refreshToken: 'refresh-token',
				expiresAt: NOW + 5_000,
			}),
		})

		await runToken(deps, ['--client-id', 'flag-id', '--client-secret', 'flag-secret'])

		expect(deps.refreshAccessToken).toHaveBeenCalledWith(
			expect.objectContaining({ clientId: 'flag-id', clientSecret: 'flag-secret' }),
			expect.anything(),
		)
	})

	it('tells the user to log in when nothing is stored', async () => {
		const deps = tokenDeps({ readCredentials: vi.fn().mockResolvedValue(undefined) })

		await expect(runToken(deps)).rejects.toThrow(/auth login/)
	})

	it('reports that an expired token cannot be refreshed without a refresh token', async () => {
		const deps = tokenDeps({
			readCredentials: vi.fn().mockResolvedValue({ accessToken: 'stale-token', expiresAt: NOW + 5_000 }),
		})

		await expect(runToken(deps)).rejects.toThrow(/auth login/)
	})
})

describe('auth logout', () => {
	const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	const originalArgv = [...process.argv]

	afterEach(() => {
		vi.clearAllMocks()
		process.argv = [...originalArgv]
	})

	function logoutDeps(overrides: Record<string, unknown> = {}) {
		return {
			configDir: () => '/tmp/cyber-asana-test',
			readSettings: vi.fn().mockResolvedValue({ client_id: 'client-123', client_secret: 'secret-456' }),
			readCredentials: vi.fn().mockResolvedValue({
				accessToken: 'stored-token',
				refreshToken: 'refresh-token',
				expiresAt: 2_000_000,
			}),
			revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
			deleteCredentials: vi.fn().mockResolvedValue(true),
			...overrides,
		}
	}

	async function runLogout(deps: Record<string, unknown>, args: string[] = []) {
		const program = new Command().addCommand(authCommand(deps as never))
		process.argv = ['node', 'test']
		await program.parseAsync(['node', 'test', 'auth', 'logout', ...args], { from: 'node' })
		return logSpy.mock.calls.map((call) => String(call[0])).join('\n')
	}

	it('revokes the grant before forgetting the refresh token', async () => {
		const order: string[] = []
		const deps = logoutDeps({
			revokeRefreshToken: vi.fn(async () => {
				order.push('revoke')
			}),
			deleteCredentials: vi.fn(async () => {
				order.push('delete')
				return true
			}),
		})

		await runLogout(deps)

		expect(order).toEqual(['revoke', 'delete'])
	})

	it('revokes with an app registration passed on the command line', async () => {
		const deps = logoutDeps({ readSettings: vi.fn().mockResolvedValue({}) })

		await runLogout(deps, ['--client-id', 'flag-id', '--client-secret', 'flag-secret'])

		expect(deps.revokeRefreshToken).toHaveBeenCalledWith(
			expect.objectContaining({ clientId: 'flag-id', clientSecret: 'flag-secret' }),
			expect.anything(),
		)
	})

	it('deletes the local credentials without revoking when asked to stay local', async () => {
		const deps = logoutDeps()

		await runLogout(deps, ['--local'])

		expect(deps.revokeRefreshToken).not.toHaveBeenCalled()
		expect(deps.deleteCredentials).toHaveBeenCalled()
	})

	it('still forgets the credentials when revocation fails, and says so', async () => {
		const deps = logoutDeps({ revokeRefreshToken: vi.fn().mockRejectedValue(new Error('invalid_client')) })

		const out = await runLogout(deps)

		expect(deps.deleteCredentials).toHaveBeenCalled()
		expect(out).toMatch(/invalid_client|could not revoke/i)
	})

	it('reports already logged out rather than failing', async () => {
		const deps = logoutDeps({
			readCredentials: vi.fn().mockResolvedValue(undefined),
			deleteCredentials: vi.fn().mockResolvedValue(false),
		})

		const out = await runLogout(deps)

		expect(deps.revokeRefreshToken).not.toHaveBeenCalled()
		expect(out).toMatch(/not logged in|already/i)
	})
})
