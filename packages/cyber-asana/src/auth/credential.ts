import { isUnexpandedPlaceholder } from '../platform/env.js'

// Which credential this process will actually use — and which ones it is
// ignoring. The precedence chain is otherwise invisible: a stale env var
// silently shadowing a newer one looks identical to a bad token.

/** Token-bearing environment variables, most preferred first. */
const TOKEN_ENV_VARS = ['ASANA_ACCESS_TOKEN', 'ASANA_TOKEN'] as const

const FLAG_SOURCE = '--token'
const STORED_SOURCE = 'credentials.json'

export type StoredCredential = {
	accessToken: string
	expiresAt: number
	user?: { gid: string; name?: string; email?: string }
}

export type Credential = {
	authenticated: boolean
	/** Label of the winning source, e.g. `--token` or `ASANA_ACCESS_TOKEN`. */
	source?: string
	token?: string
	/** Labels of sources that hold a token but lost to `source`. */
	shadowed: string[]
	/**
	 * Environment variables holding an unexpanded `${VAR}` reference instead of a
	 * value. Not credentials, but naming them turns a bare "not authenticated"
	 * into something the user can act on.
	 */
	unexpanded: string[]
	/** Only stored OAuth credentials carry an expiry; a PAT never expires. */
	expiresAt?: number
	user?: StoredCredential['user']
}

/** A token rendered for display — enough to recognize, not enough to use. */
export function maskToken(token: string): string {
	return token.length > 4 ? `…${token.slice(-4)}` : '…'
}

export type ResolveCredentialInput = {
	tokenOverride?: string
	env?: Record<string, string | undefined>
	stored?: StoredCredential
}

export function resolveCredential({ tokenOverride, env = process.env, stored }: ResolveCredentialInput): Credential {
	const candidates: Array<{ source: string; token: string; stored?: StoredCredential }> = []
	const unexpanded: string[] = []
	if (tokenOverride) candidates.push({ source: FLAG_SOURCE, token: tokenOverride })
	for (const name of TOKEN_ENV_VARS) {
		const token = env[name]
		if (!token) continue
		// A reference the host never expanded is not a token. Letting it compete
		// would shadow every source below it with a value that cannot authenticate.
		if (isUnexpandedPlaceholder(token)) {
			unexpanded.push(name)
			continue
		}
		candidates.push({ source: name, token })
	}
	// Last: an explicit flag or env var is a deliberate override of whatever
	// `auth login` stored, and saying which one won is the point of `status`.
	if (stored?.accessToken) candidates.push({ source: STORED_SOURCE, token: stored.accessToken, stored })

	const [winner, ...rest] = candidates
	if (!winner) return { authenticated: false, shadowed: [], unexpanded }
	return {
		authenticated: true,
		source: winner.source,
		token: winner.token,
		shadowed: rest.map((c) => c.source),
		unexpanded,
		expiresAt: winner.stored?.expiresAt,
		user: winner.stored?.user,
	}
}
