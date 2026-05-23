import Asana from 'asana'
import { createClient } from '../client.js'
import { type PaginationOptions, toAsanaPaginationOptions, unwrapListResponse } from '../pagination.js'

export async function listPortfolios(workspaceGid: string, opts?: PaginationOptions & { owner?: string }) {
	const api = new Asana.PortfoliosApi(createClient())
	const res = await api.getPortfolios(workspaceGid, {
		owner: opts?.owner,
		...toAsanaPaginationOptions(opts),
	})
	return unwrapListResponse(res, opts)
}

export async function getPortfolio(portfolioGid: string) {
	const api = new Asana.PortfoliosApi(createClient())
	const res = await api.getPortfolio(portfolioGid, {})
	return res.data
}

export async function createPortfolio(workspaceGid: string, name: string) {
	const api = new Asana.PortfoliosApi(createClient())
	const res = await api.createPortfolio({ data: { name, workspace: workspaceGid } })
	return res.data
}

export async function updatePortfolio(portfolioGid: string, fields: { name?: string }) {
	const api = new Asana.PortfoliosApi(createClient())
	const res = await api.updatePortfolio({ data: fields }, portfolioGid, {})
	return res.data
}

export async function deletePortfolio(portfolioGid: string) {
	const api = new Asana.PortfoliosApi(createClient())
	await api.deletePortfolio(portfolioGid)
}
