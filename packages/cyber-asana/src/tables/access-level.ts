/** Access levels Asana accepts for a table's (or record's) default member access. */
export const ACCESS_LEVELS = ['admin', 'editor', 'commenter', 'viewer'] as const
export type AccessLevel = (typeof ACCESS_LEVELS)[number]
