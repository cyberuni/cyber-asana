import { expect, it } from 'vitest'
import { listItems } from '../platform/pagination.js'
import type { PortfolioApi } from './api.js'

export type PortfolioItemsAcceptanceDeps = {
	getApi: () => Pick<
		PortfolioApi,
		'addPortfolioItem' | 'removePortfolioItem' | 'listPortfolioItems' | 'createPortfolio' | 'deletePortfolio'
	>
	workspaceGid: string
	/** A project to put in and take out of a throwaway portfolio. */
	projectGid: string
	/** A portfolio name no one else uses, so a rerun never clashes with a leftover. */
	uniqueName: () => string
}

/**
 * The Asana call shapes behind `portfolio item add | remove` (the request bodies § 3 of the scrum
 * design marks *(docs)*): it makes a portfolio, adds and removes a project twice each, and deletes it.
 */
export function definePortfolioItemsAcceptanceSpecs(deps: PortfolioItemsAcceptanceDeps) {
	return () => {
		it('adds and removes a project, and repeating either is a no-op', async () => {
			const api = deps.getApi()
			const portfolio = await api.createPortfolio(deps.workspaceGid, deps.uniqueName())
			try {
				const gids = async () =>
					listItems(await api.listPortfolioItems(portfolio.gid, { fetchAll: true, optFields: 'gid' })).map((i) => i.gid)

				expect((await api.addPortfolioItem(portfolio.gid, deps.projectGid)).status).toBe('added')
				expect(await gids()).toContain(deps.projectGid)
				expect((await api.addPortfolioItem(portfolio.gid, deps.projectGid)).status).toBe('already_added')

				expect((await api.removePortfolioItem(portfolio.gid, deps.projectGid)).status).toBe('removed')
				expect(await gids()).not.toContain(deps.projectGid)
				expect((await api.removePortfolioItem(portfolio.gid, deps.projectGid)).status).toBe('already_removed')
			} finally {
				await api.deletePortfolio(portfolio.gid)
			}
		})
	}
}
