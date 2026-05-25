export function isSystemTestEnabled(): boolean {
	return Boolean(process.env.ASANA_SYSTEM_TEST && process.env.ASANA_TOKEN)
}

export function systemEnv(name: string): string | undefined {
	const value = process.env[name]
	return value === '' ? undefined : value
}

export function requireSystemEnv(name: string): string {
	const value = systemEnv(name)
	if (!value) {
		throw new Error(`Missing ${name} for system test`)
	}
	return value
}
