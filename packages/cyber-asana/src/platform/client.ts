import Asana from 'asana'
import { rateLimitClient } from '../rate-limit/rate-limit-client.js'
import { envValue } from './env.js'

let tokenOverride: string | undefined
let ambientToken: string | undefined

export function setTokenOverride(token: string | undefined) {
	tokenOverride = token
}

/**
 * A token loaded from stored OAuth credentials. It sits below the flag and the
 * environment variables so `auth status` can still name the real source — a
 * stored token reported as `--token` would defeat the whole diagnostic.
 */
export function setAmbientToken(token: string | undefined) {
	ambientToken = token
}

export function getTokenOverride(): string | undefined {
	return tokenOverride
}

export function createClient(): Asana.ApiClient {
	const token = tokenOverride ?? envValue('ASANA_TOKEN') ?? ambientToken
	if (!token)
		throw new Error(
			`ASANA_TOKEN environment variable is not set.

To create a Personal Access Token (PAT):
  1. Go to https://app.asana.com/0/my-apps
  2. Click "Create new token"
  3. Give it a name (e.g. "cyber-asana")
  4. Copy the token — it will only be shown once

Then set it in your shell:
  export ASANA_ACCESS_TOKEN=<your-token>
  # deprecated fallback:
  export ASANA_TOKEN=<your-token>

Or pass it inline with --token:
  cyber-asana --token <your-token> <command>`,
		)
	const client = new Asana.ApiClient()
	client.authentications['token'].accessToken = token
	return rateLimitClient(client, {
		token,
		read: envValue,
		onWait: (ms, plan) =>
			console.error(`cyber-asana: waiting ${Math.ceil(ms / 1000)}s to stay within the Asana rate limit (${plan} plan)`),
	})
}
