import { InvalidArgumentError } from 'commander'
import { ACCESS_LEVELS, type AccessLevel } from './access-level.js'

/** Commander parser for `--default-access-level`. */
export function parseAccessLevel(value: string): AccessLevel {
	if (!(ACCESS_LEVELS as readonly string[]).includes(value)) {
		throw new InvalidArgumentError(`access level must be one of ${ACCESS_LEVELS.join(', ')}`)
	}
	return value as AccessLevel
}
