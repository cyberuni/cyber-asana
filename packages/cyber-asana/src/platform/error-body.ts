type AsanaApiErrorDetail = {
	message: string
	help?: string
	phrase?: string
}

export type ErrorBody = {
	ok: false
	error: {
		kind: 'asana_api' | 'config' | 'internal'
		message: string
		status?: number
		errors?: AsanaApiErrorDetail[]
		hint?: string
	}
}

type AsanaResponseError = {
	response?: {
		status?: number
		body?: {
			errors?: AsanaApiErrorDetail[]
		}
	}
}

function asAsanaResponseError(error: unknown): AsanaResponseError | undefined {
	if (!error || typeof error !== 'object' || !('response' in error)) return undefined
	return error as AsanaResponseError
}

// An operation that knows why Asana refused it can attach a `hint` to the thrown
// error; both the CLI renderer and the MCP error body pass it straight through.
function attachedHint(error: unknown): string | undefined {
	if (!error || typeof error !== 'object' || !('hint' in error)) return undefined
	const hint = (error as { hint?: unknown }).hint
	return typeof hint === 'string' ? hint : undefined
}

function normalizeAsanaErrors(errors: unknown[] | undefined): AsanaApiErrorDetail[] | undefined {
	if (!errors?.length) return undefined
	return errors.map((entry) => {
		if (entry && typeof entry === 'object' && 'message' in entry) {
			const detail = entry as AsanaApiErrorDetail
			return {
				message: String(detail.message),
				...(detail.help !== undefined && { help: String(detail.help) }),
				...(detail.phrase !== undefined && { phrase: String(detail.phrase) }),
			}
		}
		return { message: JSON.stringify(entry) }
	})
}

// Asana answers 402 when the endpoint itself works but the workspace's plan does
// not include it. That is a billing fact, not a bug in the call, so it gets named
// rather than left to read as a generic failure.
export const PLAN_LIMITATION_STATUS = 402
const PLAN_LIMITATION_HINT =
	"Asana answered 402 — this operation is above the workspace's plan level. Upgrade the workspace or use a workspace whose plan includes it."

export function buildErrorBody(error: unknown): ErrorBody {
	const asanaError = asAsanaResponseError(error)
	const asanaErrors = normalizeAsanaErrors(asanaError?.response?.body?.errors)
	const hint = attachedHint(error)
	if (asanaErrors?.length) {
		const status = asanaError?.response?.status
		// A hint the operation attached wins: it knows more about the call than the
		// status code does. Otherwise a 402 still gets named as a plan limitation.
		const asanaHint = hint ?? (status === PLAN_LIMITATION_STATUS ? PLAN_LIMITATION_HINT : undefined)
		return {
			ok: false,
			error: {
				kind: 'asana_api',
				message: asanaErrors.map((entry) => entry.message).join('; '),
				...(status !== undefined && { status }),
				errors: asanaErrors,
				...(asanaHint !== undefined && { hint: asanaHint }),
			},
		}
	}

	const message = error instanceof Error ? error.message : String(error)
	if (message.includes('ASANA_TOKEN')) {
		return {
			ok: false,
			error: {
				kind: 'config',
				message,
				hint: 'Set ASANA_ACCESS_TOKEN in the MCP server environment (preferred; ASANA_TOKEN is deprecated) or pass a token when starting the server.',
			},
		}
	}

	return {
		ok: false,
		error: {
			kind: 'internal',
			message,
		},
	}
}
