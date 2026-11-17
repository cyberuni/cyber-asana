import { SURFACE_RULES, type Surface } from './surfaces.js'

/**
 * Problems with `html` on one surface, in the order they appear. It is not an HTML parser: it reads
 * tag names, the `<body>` wrapper and one nesting rule. An empty result means nothing it checks is wrong.
 */
export function checkHtml(html: string, surface: Surface): string[] {
	const rule = SURFACE_RULES[surface]
	const allowed = new Set(rule.allowed)
	const problems: string[] = []
	const seen = new Set<string>()
	for (const match of html.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)(?=[\s/>])[^>]*>/g)) {
		const tag = (match[1] as string).toLowerCase()
		if (allowed.has(tag) || seen.has(tag)) continue
		seen.add(tag)
		problems.push(
			Object.hasOwn(rule.messages, tag) ? (rule.messages[tag] as string) : `<${tag}> is not in Asana's HTML subset`,
		)
	}
	if (!/^\s*<body>[\s\S]*<\/body>\s*$/.test(html)) problems.push('the text must be wrapped in <body>')
	if (/<li\b/.test(html.replace(/<(ul|ol)\b[\s\S]*?<\/\1>/g, ''))) problems.push('<li> must sit inside <ul> or <ol>')
	return problems
}
