import { createFileScopeStore } from '../config/scope-store.js'
import { createClient } from '../platform/client.js'
import { createAsanaPortfolioGateway } from '../portfolios/gateway.js'
import { createAsanaTaskGateway } from '../tasks/gateway.js'
import { createScrumApi, type ScrumApi } from './api.js'
import { loadScrumPolicy } from './policy.js'

/** The scrum API wired to the live Asana client, the config files, and the shipped policy reference. */
export function createDefaultScrumApi(): ScrumApi {
	const client = createClient()
	return createScrumApi({
		store: createFileScopeStore,
		gateways: { portfolios: createAsanaPortfolioGateway(client), tasks: createAsanaTaskGateway(client) },
		loadPolicy: () => loadScrumPolicy(),
	})
}

export async function listScopes(...args: Parameters<ScrumApi['listScopes']>) {
	return createDefaultScrumApi().listScopes(...args)
}

export async function addScope(...args: Parameters<ScrumApi['addScope']>) {
	return createDefaultScrumApi().addScope(...args)
}

export async function removeScope(...args: Parameters<ScrumApi['removeScope']>) {
	return createDefaultScrumApi().removeScope(...args)
}

export async function resolveScope(...args: Parameters<ScrumApi['resolveScope']>) {
	return createDefaultScrumApi().resolveScope(...args)
}
