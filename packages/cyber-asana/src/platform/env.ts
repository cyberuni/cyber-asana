const ENV_ALIASES: Partial<Record<string, string[]>> = {
	ASANA_TOKEN: ['ASANA_ACCESS_TOKEN', 'ASANA_TOKEN'],
	ASANA_WORKSPACE: ['ASANA_WORKSPACE_GID', 'ASANA_WORKSPACE'],
}

// An agent host that cannot expand a `${VAR}` reference — a plugin client that
// implements only the Agent Plugins placeholders, or Claude Code when the
// variable is unset — forwards the reference text verbatim. Cursor spells the
// same reference `${env:VAR}`. Without this guard
// the placeholder reads as a real value: it shadows the deprecated alias, and a
// missing credential surfaces as a 401 rather than as missing.
const UNEXPANDED_PLACEHOLDER = /^\$\{(?:env:)?[A-Za-z_][A-Za-z0-9_]*(?::[-=?+][^}]*)?\}$/

/** Whether a value is nothing but a `${VAR}` reference the host failed to expand. */
export function isUnexpandedPlaceholder(value: string): boolean {
	return UNEXPANDED_PLACEHOLDER.test(value)
}

export function envValue(name: string): string | undefined {
	const candidates = ENV_ALIASES[name] ?? [name]
	for (const candidate of candidates) {
		const value = process.env[candidate]
		if (value !== undefined && value !== '' && !isUnexpandedPlaceholder(value)) {
			return value
		}
	}
	return undefined
}
