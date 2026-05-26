import Asana from 'asana'
import { envValue } from './env.js'

let tokenOverride: string | undefined

export function setTokenOverride(token: string | undefined) {
	tokenOverride = token
}

export function createClient(): Asana.ApiClient {
	const token = tokenOverride ?? envValue('ASANA_TOKEN')
	if (!token)
		throw new Error(
			`ASANA_TOKEN environment variable is not set.

To create a Personal Access Token (PAT):
  1. Go to https://app.asana.com/0/my-apps
  2. Click "Create new token"
  3. Give it a name (e.g. "cyber-asana")
  4. Copy the token — it will only be shown once

Then set it in your shell:
  export ASANA_ASSESS_TOKEN=<your-token>
  # deprecated fallback:
  export ASANA_TOKEN=<your-token>

Or pass it inline with --token:
  cyber-asana --token <your-token> <command>`,
		)
	const client = new Asana.ApiClient()
	client.authentications['token'].accessToken = token
	return client
}
