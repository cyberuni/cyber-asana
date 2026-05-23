import Asana from 'asana'

export function createClient(): Asana.ApiClient {
	const token = process.env.ASANA_TOKEN
	if (!token) throw new Error('ASANA_TOKEN env var required')
	const client = new Asana.ApiClient()
	client.authentications['token'].accessToken = token
	return client
}
