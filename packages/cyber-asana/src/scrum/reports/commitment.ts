/**
 * The sprint commitment snapshot (design D6): a status update posted when a sprint starts, holding the
 * committed tasks and their points. Asana cannot edit a status update, so the first one posted for a
 * sprint is the commitment. The text is written to be read back by `parseCommitment`.
 */
export type CommitmentTask = { gid: string; name: string; story: number; task: number }

export type Commitment = { n: number; tasks: CommitmentTask[] }

const MARKER = 'cyber-asana:sprint-commitment'
const MARKER_LINE = new RegExp(`^\\[${MARKER} n=(\\d+)\\]$`)
const TASK_LINE = /^- ([^\s|]+) \| story (\d+(?:\.\d+)?) \| task (\d+(?:\.\d+)?) \| (.*)$/

export function formatCommitment(sprint: { n: number; name: string }, tasks: CommitmentTask[]) {
	const sum = (key: 'story' | 'task') => tasks.reduce((total, t) => total + t[key], 0)
	const lines = [
		`[${MARKER} n=${sprint.n}]`,
		`${sprint.name} committed: ${tasks.length} tasks, ${sum('story')} story points, ${sum('task')} task points`,
		...tasks.map((t) => `- ${t.gid} | story ${t.story} | task ${t.task} | ${t.name.replace(/\s+/g, ' ')}`),
	]
	return { title: `${sprint.name} started`, text: lines.join('\n') }
}

/** The commitment a status update's text holds, or undefined when it is not a snapshot. */
export function parseCommitment(text: string | undefined | null): Commitment | undefined {
	const lines = (text ?? '').split('\n').map((l) => l.trimEnd())
	const head = lines.map((l) => MARKER_LINE.exec(l)).find((m) => m !== null)
	if (!head) return undefined
	const tasks: CommitmentTask[] = []
	for (const line of lines) {
		const m = TASK_LINE.exec(line)
		if (m) tasks.push({ gid: m[1] as string, name: m[4] as string, story: Number(m[2]), task: Number(m[3]) })
	}
	return { n: Number(head[1]), tasks }
}

/** The earliest snapshot posted for sprint `n` among status updates, since a later one is not the commitment. */
export function findCommitment<T extends { text?: string | null; created_at?: string | null }>(
	statuses: T[],
	n: number,
): (T & { commitment: Commitment }) | undefined {
	return statuses
		.flatMap((s) => {
			const commitment = parseCommitment(s.text)
			return commitment?.n === n ? [{ ...s, commitment }] : []
		})
		.sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))[0]
}
