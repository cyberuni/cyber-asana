/** Throws unless `value`, when given, is a real calendar date written `YYYY-MM-DD`. */
export function assertIsoDate(label: string, value?: string) {
	if (value === undefined) return
	const date = new Date(`${value}T00:00:00Z`)
	const valid =
		/^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
	if (!valid) throw new Error(`${label} must be a date (YYYY-MM-DD); got "${value}"`)
}
