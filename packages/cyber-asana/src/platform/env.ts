// An agent host that cannot expand a `${VAR}` reference — a plugin client that
// implements only the Agent Plugins placeholders, or Claude Code when the
// variable is unset — forwards the reference text verbatim. Cursor spells the
// same reference `${env:VAR}`. Without this guard
// the placeholder reads as a real value, and a missing credential surfaces as a
// 401 rather than as missing.
const UNEXPANDED_PLACEHOLDER = /^\$\{(?:env:)?[A-Za-z_][A-Za-z0-9_]*(?::[-=?+][^}]*)?\}$/

/** Whether a value is nothing but a `${VAR}` reference the host failed to expand. */
export function isUnexpandedPlaceholder(value: string): boolean {
	return UNEXPANDED_PLACEHOLDER.test(value)
}

export function envValue(name: string): string | undefined {
	const value = process.env[name]
	if (value === undefined || value === '' || isUnexpandedPlaceholder(value)) return undefined
	return value
}
