import { SURFACE_RULES, type Surface, type SurfaceRule } from './surfaces.js'

/**
 * A heading the surface keeps is written as-is; any other becomes the surface's fallback. A bold
 * fallback goes on its own line, so it still reads as a heading.
 */
function heading(rule: SurfaceRule, level: number, inner: string, next: string | undefined): string {
	const tag = `h${level}`
	if (rule.allowed.includes(tag)) return `<${tag}>${inner}</${tag}>`
	const fallback = rule.headingFallback
	const line = next !== undefined && next !== '\n' && fallback === 'strong' ? '\n' : ''
	return `<${fallback}>${inner}</${fallback}>${line}`
}

/**
 * Normalizes `html` into the form a surface accepts: a bare `<body>`, the tags Asana renames on save
 * written as the renamed tag, paragraphs and breaks as newlines, and headings the surface does not keep
 * replaced. It repairs what has one safe answer; anything else stays for `checkHtml` to report.
 * Running it twice gives the same result as running it once.
 */
export function fixHtml(html: string, surface: Surface): string {
	const rule = SURFACE_RULES[surface]
	let out = html
		.replace(/<(\/?)b(\s[^>]*)?>/gi, '<$1strong>')
		.replace(/<(\/?)i(\s[^>]*)?>/gi, '<$1em>')
		.replace(/<(\/?)del\b[^>]*>/gi, '<$1s>')
		.replace(/<(\/?)th\b[^>]*>/gi, '<$1td>')
		.replace(/<\/p\s*>/gi, '\n\n')
		.replace(/<p\b[^>]*>/gi, '')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/?div\b[^>]*>/gi, '\n')
		.replace(/<\/?(span|sub|sup)\b[^>]*>/gi, '')
		.replace(
			/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi,
			(match: string, level: string, inner: string, offset: number, whole: string) =>
				heading(rule, Number(level), inner, whole[offset + match.length]),
		)
	out = out
		.replace(/<\/?body\b[^>]*>/gi, '')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
	return `<body>${out}</body>`
}
