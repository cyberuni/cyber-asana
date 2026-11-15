/**
 * The HTML rules a surface accepts, as pure functions over one rule table. The `html` CLI command,
 * the `asana_html_*` MCP tools and the domains that post rich text (the scrum dashboard) call these.
 */
import { checkHtml } from './check.js'
import { fixHtml } from './fix.js'
import { type HtmlRulesReport, htmlRules } from './rules.js'
import { SURFACES, type Surface } from './surfaces.js'

export { checkHtml } from './check.js'
export { SURFACES, type Surface } from './surfaces.js'

export interface HtmlCheckResult {
	surface: Surface
	ok: boolean
	problems: string[]
}

export function htmlCheckResult(html: string, surface: Surface): HtmlCheckResult {
	const problems = checkHtml(html, surface)
	return { surface, ok: problems.length === 0, problems }
}

/** The fixed html, and whatever `fix` could not repair, checked on the same surface. */
export function htmlFixResult(html: string, surface: Surface): HtmlCheckResult & { html: string } {
	const fixed = fixHtml(html, surface)
	return { ...htmlCheckResult(fixed, surface), html: fixed }
}

/** The rules of one surface, or of every surface in table order. */
export function htmlRulesFor(surface?: Surface): HtmlRulesReport[] {
	return (surface ? [surface] : [...SURFACES]).map(htmlRules)
}
