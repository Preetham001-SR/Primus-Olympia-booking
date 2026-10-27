<?php
/**
 * Pure helpers (no WordPress calls) so tests/score-test.php can run them with plain `php`.
 */

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6-9. Returns 10 digits or null. */
function pc_visit_normalize_phone( string $raw ): ?string {
	$d = preg_replace( '/[\s\-().]/', '', $raw );
	$d = preg_replace( '/^(\+?91|0)(?=\d{10}$)/', '', $d );
	return preg_match( '/^[6-9]\d{9}$/', $d ) ? $d : null;
}

/**
 * Lead score 0-8. timeline now +3 / 1-3m +2, budget 98l-plus +2, visit for self or parent +1,
 * visit within 14 days of $today +1, pincode looks serviceable +1.
 */
function pc_visit_score( array $lead, bool $serviceable, string $today ): int {
	$score  = [ 'now' => 3, '1-3m' => 2 ][ $lead['timeline'] ?? '' ] ?? 0;
	$score += ( $lead['budget'] ?? '' ) === '98l-plus' ? 2 : 0;
	$score += in_array( $lead['visit_for'] ?? '', [ 'self', 'parent' ], true ) ? 1 : 0;
	$days   = ( strtotime( ( $lead['visit_date'] ?? '' ) . ' UTC' ) - strtotime( $today . ' UTC' ) ) / 86400;
	$score += ( ! empty( $lead['visit_date'] ) && $days >= 0 && $days <= 14 ) ? 1 : 0;
	$score += $serviceable ? 1 : 0;
	return $score;
}

function pc_visit_band( int $score ): string {
	return $score >= 6 ? 'hot' : ( $score >= 3 ? 'warm' : 'cold' );
}
