/**
 * Platform fee calculation helpers.
 *
 * The default fee comes from PLATFORM_FEE_PERCENT env variable.
 * Partner organizers can have a custom feePercent on their Organizer record.
 *
 * Fees are snapshotted at purchase time and stored on the Payment record
 * so historical payouts are never affected by fee changes.
 */

/**
 * Resolve the effective fee percentage for an organizer.
 * @param organizerFeePercent - custom rate set on Organizer.feePercent (null = use default)
 * @returns fee percentage as a number (e.g. 4 means 4%)
 */
export function resolveFeePercent(organizerFeePercent: number | null): number {
  if (organizerFeePercent !== null && organizerFeePercent !== undefined) {
    return organizerFeePercent
  }
  const envRate = process.env.PLATFORM_FEE_PERCENT
  return envRate ? parseFloat(envRate) : 4
}

/**
 * Calculate fee and net amounts from a gross amount.
 * @param grossAmount - total ticket price in minor units (kobo)
 * @param feePercent - percentage to deduct (e.g. 4 = 4%)
 * @returns { feeAmount, netAmount, feePercent }
 */
export function calculateFee(
  grossAmount: number,
  feePercent: number
): { feeAmount: number; netAmount: number; feePercent: number } {
  const feeAmount = Math.round(grossAmount * (feePercent / 100))
  const netAmount = grossAmount - feeAmount
  return { feeAmount, netAmount, feePercent }
}
