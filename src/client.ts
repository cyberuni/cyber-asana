import Asana from 'asana'

export function createClient(): Asana.ApiClient {
	const token = process.env.ASANA_TOKEN
	if (!token)
		throw new Error(
			`ASANA_TOKEN environment variable is not set.

To create a Personal Access Token (PAT):
  1. Go to https://app.asana.com/0/my-apps
  2. Click "Create new token"
  3. Give it a name (e.g. "cyber-asana")
  4. Copy the token — it will only be shown once

Then set it in your shell:
  export ASANA_TOKEN=<your-token>

Or add it to your .env file and source it before running.`,
		)
	const client = new Asana.ApiClient()
	client.authentications['token'].accessToken = token
	return client
}
