/** The colors Asana accepts for a portfolio's `color`. */
export const PORTFOLIO_COLORS = [
	'dark-pink',
	'dark-green',
	'dark-blue',
	'dark-red',
	'dark-teal',
	'dark-brown',
	'dark-orange',
	'dark-purple',
	'dark-warm-gray',
	'light-pink',
	'light-green',
	'light-blue',
	'light-red',
	'light-teal',
	'light-brown',
	'light-orange',
	'light-purple',
	'light-warm-gray',
] as const
export type PortfolioColor = (typeof PORTFOLIO_COLORS)[number]

/** The values Asana accepts for a portfolio's `resource_subtype`. */
export const PORTFOLIO_RESOURCE_SUBTYPES = ['default_portfolio', 'custom'] as const
export type PortfolioResourceSubtype = (typeof PORTFOLIO_RESOURCE_SUBTYPES)[number]

/** The values Asana accepts for a portfolio's `default_access_level`. */
export const PORTFOLIO_DEFAULT_ACCESS_LEVELS = ['admin', 'editor', 'viewer'] as const
export type PortfolioDefaultAccessLevel = (typeof PORTFOLIO_DEFAULT_ACCESS_LEVELS)[number]
