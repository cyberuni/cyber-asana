import { KNOWN_REJECTED_TAGS, SURFACE_RULES, type Surface } from './surfaces.js'

export interface HtmlRulesReport {
	surface: Surface
	/** The outermost wrapper every surface requires. */
	body: 'required'
	/** Tags the surface keeps. */
	allowed: string[]
	/** Tags the surface refuses, from the known-rejected list and its own refusals. */
	rejected: string[]
	/** Custom text for a refused tag, when the surface says why. */
	messages: Record<string, string>
	evidence: string
	unverified: string[]
}

/** The subset a skill reads instead of prose, so the rules are stated once. */
export function htmlRules(surface: Surface): HtmlRulesReport {
	const rule = SURFACE_RULES[surface]
	const allowed = [...rule.allowed].sort()
	const rejected = [...new Set([...KNOWN_REJECTED_TAGS, ...Object.keys(rule.messages)])]
		.filter((tag) => !allowed.includes(tag))
		.sort()
	return {
		surface,
		body: 'required',
		allowed,
		rejected,
		messages: { ...rule.messages },
		evidence: rule.evidence,
		unverified: [...rule.unverified].sort(),
	}
}
