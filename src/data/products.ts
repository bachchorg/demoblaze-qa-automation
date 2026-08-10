/**
 * Product titles used across tests, matched by visible text rather than the
 * numeric catalog id — resilient to the backing product ids changing, and
 * it's what a real user actually sees. Verified present on the live site as
 * of framework authoring; `tests/api/entries.spec.ts` cross-checks the
 * catalog on every run so a removed product fails loudly instead of a UI
 * test silently timing out on a missing card.
 */
export const PRODUCTS = {
  PHONE: 'Samsung galaxy s6',
  LAPTOP: 'Sony vaio i5',
  MONITOR: 'Apple monitor 24',
} as const;
