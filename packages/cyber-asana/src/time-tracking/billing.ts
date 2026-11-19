/** Asana's exact casing for a time entry's billing status. */
export const BILLABLE_STATUSES = ['billable', 'nonBillable', 'notApplicable'] as const
export type BillableStatus = (typeof BILLABLE_STATUSES)[number]

/** Asana allows at most one category per entry today. */
export const MAX_CATEGORIES = 1
