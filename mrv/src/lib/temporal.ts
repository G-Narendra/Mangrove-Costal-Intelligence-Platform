/**
 * Temporal Calculation Utilities for the UAE Blue Carbon MRV System.
 * Baseline temporal monitoring epoch starts at January 2021 (2021-01).
 */

export const BASELINE_START_YEAR = 2021
export const BASELINE_START_MONTH = 1 // January

/**
 * Calculates the dynamic number of months elapsed from 2021-01 to a given year-month string (e.g. "2026-09").
 * Formula: (year - 2021) * 12 + month
 * E.g., for 2026-09: (2026 - 2021) * 12 + 9 = 5 * 12 + 9 = 69 months.
 * E.g., for 2026-01: (2026 - 2021) * 12 + 1 = 61 months.
 */
export function calculateDynamicMonths(latestYearMonth: string = "2026-09"): number {
  if (!latestYearMonth || !latestYearMonth.includes("-")) return 69
  const parts = latestYearMonth.split("-")
  const year = parseInt(parts[0], 10) || BASELINE_START_YEAR
  const month = parseInt(parts[1], 10) || 1
  return Math.max(1, (year - BASELINE_START_YEAR) * 12 + month)
}

/**
 * Returns formatted label, e.g. "69 Months" or "69-Month Archive Active"
 */
export function getArchiveMonthLabel(latestYearMonth: string = "2026-09"): string {
  const months = calculateDynamicMonths(latestYearMonth)
  return `${months} Months`
}
