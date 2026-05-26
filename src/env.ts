const ENV_ALIASES: Partial<Record<string, string[]>> = {
	ASANA_TOKEN: ['ASANA_ASSESS_TOKEN'],
	ASANA_WORKSPACE: ['ASANA_WORKSPACE_GID'],
}

export function envValue(name: string): string | undefined {
	const candidates = [name, ...(ENV_ALIASES[name] ?? [])]
	for (const candidate of candidates) {
		const value = process.env[candidate]
		if (value !== undefined && value !== '') {
			return value
		}
	}
	return undefined
}
