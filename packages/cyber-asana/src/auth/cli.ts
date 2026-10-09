import { Command } from 'commander'
import { output, printFields, printNextSteps } from '../output.js'
import { getTokenOverride } from '../platform/client.js'
import { defaultAmbientDeps, ensureStoredCredential } from './ambient.js'
import { type Credential, maskToken, resolveCredential, type StoredCredential } from './credential.js'
import { defaultLoginDeps, type LoginParams, performLogin } from './login.js'
import { refreshAccessToken, revokeRefreshToken, type Tokens } from './oauth.js'
import { type AppCredentials, type AppSettings, configDir, readSettings, resolveAppCredentials } from './settings.js'
import { deleteCredentials, readCredentials, writeCredentials } from './token-store.js'

// `auth status` is a credential diagnostic that works when the credential does
// not — `user me` answers "who am I to Asana?" and needs a working token to
// answer at all. This answers "what will this process authenticate with?", so
// it stays local and treats "no credentials" as data, not failure.

/** Asana matches the redirect URI exactly, so the port cannot be ephemeral. */
const DEFAULT_CALLBACK_PORT = 7654

const REGISTRATION_HELP = `No Asana app registration found.

cyber-asana uses your own OAuth app, so nobody else's registration sees your
data. To create one:

  1. Go to https://app.asana.com/0/my-apps and create an API app
     (not an MCP app — those only work with Asana's hosted MCP server)
  2. Add this redirect URL: http://localhost:${DEFAULT_CALLBACK_PORT}/callback
  3. Copy the client ID and client secret

Then either export them:

  export ASANA_API_CLIENT_ID=<client-id>
  export ASANA_API_CLIENT_SECRET=<client-secret>

or put them in settings.json under your config directory:

  {"client_id": "<client-id>", "client_secret": "<client-secret>"}

A personal access token remains the simpler option for a single user:
https://app.asana.com/0/my-apps`

/** Refresh this far ahead of expiry so a command never runs with a token that dies mid-flight. */
const REFRESH_WINDOW_MS = 60_000

const UNEXPANDED_ENV_REFERENCE = '$' + '{VAR}'
const UNEXPANDED_HINT = `set, but holds an unexpanded ${UNEXPANDED_ENV_REFERENCE} reference — the agent host did not substitute a value`

export type AuthCommandDeps = {
	readCredential: (input?: { stored?: StoredCredential }) => Credential
	/** Stored OAuth credentials, refreshed when stale — undefined when not logged in. */
	readStoredCredential: () => Promise<Tokens | undefined>
	configDir: () => string
	readSettings: (dir: string) => Promise<AppSettings>
	/** The app registration `auth login` would authorize with — undefined when none is configured. */
	readAppCredentials: (input: {
		settings: AppSettings
		overrides?: { clientId?: string; clientSecret?: string }
	}) => AppCredentials | undefined
	login: (params: LoginParams) => Promise<Tokens>
	readCredentials: (dir: string) => Promise<Tokens | undefined>
	writeCredentials: (dir: string, tokens: Tokens) => Promise<void>
	deleteCredentials: (dir: string) => Promise<boolean>
	refreshAccessToken: typeof refreshAccessToken
	revokeRefreshToken: typeof revokeRefreshToken
	now: () => number
}

function defaultDeps(): AuthCommandDeps {
	return {
		readCredential: (input) => resolveCredential({ tokenOverride: getTokenOverride(), stored: input?.stored }),
		readStoredCredential: async () => (await ensureStoredCredential(defaultAmbientDeps())).tokens,
		configDir: () => configDir(),
		readSettings,
		readAppCredentials: ({ settings, overrides }) => resolveAppCredentials({ settings, overrides }),
		login: (params) => performLogin(params, defaultLoginDeps()),
		readCredentials,
		writeCredentials,
		deleteCredentials,
		refreshAccessToken,
		revokeRefreshToken,
		now: () => Date.now(),
	}
}

type AppOptions = { clientId?: string; clientSecret?: string }

/** The two flags every command that needs an app registration accepts. */
function addAppOptions(cmd: Command): Command {
	return cmd
		.option('--client-id <id>', 'OAuth client ID (overrides ASANA_API_CLIENT_ID, ASANA_CLIENT_ID, and settings.json)')
		.option('--client-secret <secret>', 'OAuth client secret (visible in shell history — prefer the env var)')
}

function portOf(redirectUri: string | undefined): number {
	if (!redirectUri) return DEFAULT_CALLBACK_PORT
	try {
		const port = new URL(redirectUri).port
		return port ? Number(port) : DEFAULT_CALLBACK_PORT
	} catch {
		return DEFAULT_CALLBACK_PORT
	}
}

function parseScopes(value: string | undefined): string[] | undefined {
	if (!value) return undefined
	const scopes = value
		.split(',')
		.map((scope) => scope.trim())
		.filter(Boolean)
	return scopes.length > 0 ? scopes : undefined
}

function describeUser(user: Tokens['user']): string | null {
	if (!user) return null
	return user.email ? `${user.name ?? user.gid} <${user.email}>` : (user.name ?? user.gid)
}

export function authCommand(overrides: Partial<AuthCommandDeps> = {}) {
	const deps = { ...defaultDeps(), ...overrides }
	const cmd = new Command('auth').description('Inspect and manage Asana credentials')

	cmd.addHelpText(
		'after',
		[
			'',
			'Examples:',
			'  cyber-asana auth status',
			'  cyber-asana auth login',
			'  cyber-asana auth login --no-store --raw',
			'',
			'Every subcommand supports --help for its own options.',
		].join('\n'),
	)

	addAppOptions(
		cmd.command('status').description('Show which credential this CLI will use, without calling the Asana API'),
	).action(async (opts: AppOptions) => {
		const stored = await deps.readStoredCredential()
		const credential = deps.readCredential({
			stored: stored ? { accessToken: stored.accessToken, expiresAt: stored.expiresAt, user: stored.user } : undefined,
		})
		const expires = credential.expiresAt ? new Date(credential.expiresAt).toISOString() : null
		// The registration resolves from its own chain, so a working token says
		// nothing about which app `auth login` would authorize with next.
		const app = deps.readAppCredentials({
			settings: await deps.readSettings(deps.configDir()),
			overrides: opts,
		})
		const unexpanded = credential.unexpanded ?? []
		const appFields = {
			App: app ? `${maskToken(app.clientId)} (${app.source})` : null,
			'App ignored': app && app.shadowed.length > 0 ? app.shadowed.join(', ') : null,
			// Set-but-unexpanded is the one state the user cannot diagnose from
			// the outside: the variable looks configured everywhere they check.
			Unexpanded: unexpanded.length > 0 ? `${unexpanded.join(', ')} (${UNEXPANDED_HINT})` : null,
		}
		output(
			{
				authenticated: credential.authenticated,
				source: credential.source ?? null,
				masked_token: credential.token ? maskToken(credential.token) : null,
				shadowed: credential.shadowed,
				unexpanded,
				expires_at: expires,
				user: credential.user ?? null,
				app: app ? { client_id_masked: maskToken(app.clientId), source: app.source, shadowed: app.shadowed } : null,
			},
			() => {
				if (!credential.authenticated) {
					printFields({ Status: 'not authenticated', ...appFields })
					printNextSteps([
						'export ASANA_ACCESS_TOKEN=<pat> — https://app.asana.com/0/my-apps',
						'cyber-asana auth login — authorize through OAuth',
					])
					return
				}
				printFields({
					Status: 'authenticated',
					Source: credential.source,
					Account: describeUser(credential.user),
					Token: credential.token ? maskToken(credential.token) : null,
					Expires: expires,
					Ignored: credential.shadowed.length > 0 ? credential.shadowed.join(', ') : null,
					...appFields,
				})
			},
		)
	})

	addAppOptions(cmd.command('login').description('Authorize through OAuth in the browser and store the credentials'))
		.option('--no-store', 'Print the token instead of saving it')
		.option('--include-refresh-token', 'Also print the long-lived refresh token (implies --no-store)')
		.option('--raw', 'Print only the token, for shell substitution')
		.option('--scope <list>', 'Comma-separated scopes to request')
		.option('--manual', 'Paste the code from the browser instead of listening for a redirect')
		.option('--redirect-uri <uri>', 'Redirect URL registered for the app (default: the loopback URL)')
		.option('--port <port>', `Callback port (default: ${DEFAULT_CALLBACK_PORT})`)
		.action(
			async (
				opts: AppOptions & {
					store?: boolean
					includeRefreshToken?: boolean
					raw?: boolean
					scope?: string
					manual?: boolean
					redirectUri?: string
					port?: string
				},
			) => {
				const dir = deps.configDir()
				const app = resolveAppCredentials({ settings: await deps.readSettings(dir), overrides: opts })
				if (!app) throw new Error(REGISTRATION_HELP)

				const tokens = await deps.login({
					app,
					// The listener has to bind the port the registered URL names, or
					// the redirect arrives somewhere nothing is listening.
					port: opts.port ? Number(opts.port) : portOf(opts.redirectUri),
					scopes: parseScopes(opts.scope),
					manual: opts.manual,
					redirectUri: opts.redirectUri,
				})

				// Asking for the refresh token only makes sense when printing.
				const store = opts.store !== false && !opts.includeRefreshToken
				if (store) {
					await deps.writeCredentials(dir, tokens)
					output(
						{
							stored: true,
							user: tokens.user ?? null,
							expires_at: new Date(tokens.expiresAt).toISOString(),
						},
						() => {
							printFields({
								Status: 'authorized',
								Account: describeUser(tokens.user),
								Expires: new Date(tokens.expiresAt).toISOString(),
							})
							printNextSteps(['cyber-asana auth status — confirm which credential is in effect'])
						},
					)
					return
				}

				// --no-store puts a live credential on stdout: shell history, CI logs,
				// and agent transcripts all capture it. The access token expires in an
				// hour; the refresh token does not, so it stays behind a second flag.
				if (opts.raw) {
					console.log(tokens.accessToken)
					return
				}
				output(
					{
						access_token: tokens.accessToken,
						refresh_token: opts.includeRefreshToken ? (tokens.refreshToken ?? null) : undefined,
						expires_at: new Date(tokens.expiresAt).toISOString(),
						user: tokens.user ?? null,
					},
					() => {
						printFields({
							Token: tokens.accessToken,
							'Refresh token': opts.includeRefreshToken ? (tokens.refreshToken ?? null) : null,
							Expires: new Date(tokens.expiresAt).toISOString(),
							Account: describeUser(tokens.user),
						})
						printNextSteps(['export ASANA_ACCESS_TOKEN=<token> — use it for the next hour'])
					},
				)
			},
		)

	addAppOptions(
		cmd.command('token').description('Print the stored access token, refreshing it first when it is about to expire'),
	).action(async (opts: AppOptions) => {
		const dir = deps.configDir()
		const stored = await deps.readCredentials(dir)
		if (!stored) throw new Error('Not logged in. Run `cyber-asana auth login` first.')

		let tokens = stored
		if (tokens.expiresAt - deps.now() < REFRESH_WINDOW_MS) {
			const app = resolveAppCredentials({ settings: await deps.readSettings(dir), overrides: opts })
			if (!tokens.refreshToken || !app) {
				throw new Error(
					'The stored access token has expired and cannot be refreshed. Run `cyber-asana auth login` again.',
				)
			}
			tokens = await deps.refreshAccessToken(
				{ clientId: app.clientId, clientSecret: app.clientSecret, refreshToken: tokens.refreshToken },
				{ fetch: globalThis.fetch, now: deps.now },
			)
			await deps.writeCredentials(dir, tokens)
		}

		// This command exists to be piped into other tools, so text output is
		// the bare token and nothing else.
		output({ access_token: tokens.accessToken, expires_at: new Date(tokens.expiresAt).toISOString() }, () => {
			console.log(tokens.accessToken)
		})
	})

	addAppOptions(cmd.command('logout').description('Revoke the stored grant and delete the local credentials'))
		.option('--local', 'Delete the local credentials without revoking the grant')
		.action(async (opts: AppOptions & { local?: boolean }) => {
			const dir = deps.configDir()
			const stored = await deps.readCredentials(dir)

			// Asana revokes only refresh tokens, so revocation has to happen before
			// the file is deleted — afterwards there is nothing left to revoke with.
			let revocationError: string | undefined
			if (stored?.refreshToken && !opts.local) {
				const app = resolveAppCredentials({ settings: await deps.readSettings(dir), overrides: opts })
				if (app) {
					try {
						await deps.revokeRefreshToken(
							{ clientId: app.clientId, clientSecret: app.clientSecret, refreshToken: stored.refreshToken },
							{ fetch: globalThis.fetch, now: deps.now },
						)
					} catch (error) {
						revocationError = error instanceof Error ? error.message : String(error)
					}
				}
			}

			const deleted = await deps.deleteCredentials(dir)
			output(
				{ deleted, revoked: stored?.refreshToken ? !revocationError && !opts.local : false, error: revocationError },
				() => {
					if (!deleted && !stored) {
						printFields({ Status: 'not logged in' })
						return
					}
					printFields({
						Status: 'logged out',
						Revoked: opts.local ? 'skipped (--local)' : revocationError ? 'failed' : 'yes',
						// The local credentials are gone either way; say plainly that the
						// grant may still be live so it can be revoked in the browser.
						Warning: revocationError
							? `Could not revoke the grant: ${revocationError}. Remove it at https://app.asana.com/0/my-apps`
							: null,
					})
				},
			)
		})

	return cmd
}
