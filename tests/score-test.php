<?php
// Run: php tests/score-test.php
require __DIR__ . '/../wp-content/mu-plugins/pc-visit/score.php';

function check( $got, $want, string $what ): void {
	if ( $got !== $want ) {
		fwrite( STDERR, "FAIL $what: got " . var_export( $got, true ) . ', want ' . var_export( $want, true ) . "\n" );
		exit( 1 );
	}
}

// Phone normalisation
check( pc_visit_normalize_phone( '98765 43210' ), '9876543210', 'spaces' );
check( pc_visit_normalize_phone( '+91-98765-43210' ), '9876543210', '+91 with dashes' );
check( pc_visit_normalize_phone( '919876543210' ), '9876543210', '91 prefix, no plus' );
check( pc_visit_normalize_phone( '09876543210' ), '9876543210', 'leading 0' );
check( pc_visit_normalize_phone( '9198765432' ), '9198765432', '10 digits starting 91 kept as is' );
check( pc_visit_normalize_phone( '5876543210' ), null, 'starts with 5' );
check( pc_visit_normalize_phone( '987654321' ), null, '9 digits' );
check( pc_visit_normalize_phone( '+1 9876543210' ), null, 'foreign prefix' );

// Score and band
$today = '2026-10-27';
$hot   = [ 'timeline' => 'now', 'budget' => '98l-plus', 'visit_for' => 'parent', 'visit_date' => '2026-11-05' ];
check( pc_visit_score( $hot, true, $today ), 8, 'max score' );
check( pc_visit_band( 8 ), 'hot', 'band 8' );
check( pc_visit_score( $hot, false, $today ), 7, 'not serviceable' );
check( pc_visit_score( [ 'visit_date' => '2026-11-10' ], false, $today ), 1, 'day 14 counts' );
check( pc_visit_score( [ 'visit_date' => '2026-11-11' ], false, $today ), 0, 'day 15 does not' );
check( pc_visit_score( [ 'timeline' => '1-3m', 'visit_for' => 'other' ], false, $today ), 2, 'mid' );
check( pc_visit_score( [], false, $today ), 0, 'empty' );
check( pc_visit_band( 6 ), 'hot', 'band 6' );
check( pc_visit_band( 5 ), 'warm', 'band 5' );
check( pc_visit_band( 3 ), 'warm', 'band 3' );
check( pc_visit_band( 2 ), 'cold', 'band 2' );

echo "All score checks passed\n";
