import type { Lineup, NadeExecute } from '../types'
import {
  POTENTIAL_EXECUTES_ARCHIVE,
  POTENTIAL_LINEUPS_ARCHIVE
} from './potentialLineupsArchive'

export { POTENTIAL_LINEUPS_ARCHIVE, POTENTIAL_EXECUTES_ARCHIVE }

/**
 * Active default lineups on the radar & main lists (emptied; all 92 curated lineups
 * are stored in `POTENTIAL_LINEUPS_ARCHIVE` in `./potentialLineupsArchive.ts` and
 * `server/data/potential_lineups_archive.json`).
 */
export const DEFAULT_LINEUPS: Lineup[] = []

/**
 * Active default team executes (emptied; archived in `POTENTIAL_EXECUTES_ARCHIVE`).
 */
export const DEFAULT_EXECUTES: NadeExecute[] = []
