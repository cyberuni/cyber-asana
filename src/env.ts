const ENV_ALIASES: Partial<Record<string, string[]>> = {
	ASANA_TOKEN: ['ASANA_ASSESS_TOKEN', 'ASANA_TOKEN'],
	ASANA_WORKSPACE: ['ASANA_WORKSPACE_GID', 'ASANA_WORKSPACE'],
}

export function envValue(name: string): string | undefined {
	const candidates = ENV_ALIASES[name] ?? [name]
	for (const candidate of candidates) {
		const value = process.env[candidate]
		if (value !== undefined && value !== '') {
			return value
		}
	}
	return undefined
}
