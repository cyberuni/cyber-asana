/**
 * The `schedule_dates` object of `duplicateProject`: shift the copied tasks so the project starts or
 * ends on a date. Asana requires the weekend flag and exactly one of the two dates.
 */
export type ScheduleDates = {
	should_skip_weekends: boolean
	start_on?: string
	due_on?: string
}

/** Fail before any request when Asana would reject the schedule. */
export function assertScheduleDates(schedule: ScheduleDates | undefined, include: string[] | undefined) {
	if (!schedule) return
	if ((schedule.start_on === undefined) === (schedule.due_on === undefined)) {
		throw new Error('schedule dates take exactly one of start_on or due_on')
	}
	if (!include?.includes('task_dates')) {
		throw new Error('schedule dates need task_dates in the include list')
	}
}

/**
 * Build `schedule_dates` from the CLI flags. A schedule date alone defaults the weekend flag to false,
 * because Asana always needs the boolean; a weekend flag without a date has nothing to apply to.
 */
export function buildScheduleDates(input: {
	startOn?: string
	dueOn?: string
	skipWeekends?: boolean
}): ScheduleDates | undefined {
	if (input.startOn === undefined && input.dueOn === undefined) {
		if (input.skipWeekends !== undefined) {
			throw new Error('--skip-weekends needs --schedule-start-on or --schedule-due-on')
		}
		return undefined
	}
	return {
		should_skip_weekends: input.skipWeekends ?? false,
		...(input.startOn !== undefined && { start_on: input.startOn }),
		...(input.dueOn !== undefined && { due_on: input.dueOn }),
	}
}
