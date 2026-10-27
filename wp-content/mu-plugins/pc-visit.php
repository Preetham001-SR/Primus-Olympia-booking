<?php
/**
 * Plugin Name: Primus Chauffeur Site Visit
 * Description: Olympia "Complimentary Doorstep Chauffeur Pickup & Drop" site-visit booking. Hero strip, section, modal, 2-step qualified lead form, AJAX handler.
 * Version: 1.0.0
 *
 * Theme template needs two lines on the Olympia page:
 *   do_action( 'pc_visit_strip' );    // right after the hero banner's closing </section> (not inside: the banner is a flex row)
 *   do_action( 'pc_visit_section' );  // right after the Services section
 */

defined( 'ABSPATH' ) || exit;
require __DIR__ . '/pc-visit/score.php';

const PC_VISIT_VER   = '1.0.0';
const PC_VISIT_OFFER = 'olympia-chauffeur-v1';

function pc_visit_enabled(): bool {
	$on = is_singular() && get_post_field( 'post_name', get_queried_object_id() ) === 'olympia';
	return (bool) apply_filters( 'pc_visit_enabled', $on );
}

/* shortcut: any 560xxx pincode reads as "likely serviceable". Replace with the ops team's list via this filter. */
function pc_visit_pincode_re(): string {
	return (string) apply_filters( 'pc_visit_pincode_re', '^560\d{3}$' );
}

/* ---------- Front end ---------- */

add_action( 'wp_enqueue_scripts', function () {
	if ( ! pc_visit_enabled() ) {
		return;
	}
	wp_enqueue_style( 'pc-visit', plugins_url( 'pc-visit/pc-visit.css', __FILE__ ), [], PC_VISIT_VER );
	wp_enqueue_script( 'pc-visit', plugins_url( 'pc-visit/pc-visit.js', __FILE__ ), [], PC_VISIT_VER, [ 'in_footer' => true, 'strategy' => 'defer' ] );
	wp_localize_script( 'pc-visit', 'pcVisit', [
		'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
		'nonce'     => wp_create_nonce( 'pc_visit' ),
		'whatsapp'  => '919845037078',
		'pincodeRe' => pc_visit_pincode_re(),
	] );
} );

add_action( 'pc_visit_strip', function () {
	if ( pc_visit_enabled() ) {
		include __DIR__ . '/pc-visit/strip.php';
	}
} );
add_action( 'pc_visit_section', function () {
	if ( pc_visit_enabled() ) {
		include __DIR__ . '/pc-visit/section.php';
	}
} );

/* ---------- Lead storage: private post type, visible in wp-admin to editors ---------- */

add_action( 'init', function () {
	register_post_type( 'pc_visit_lead', [
		'label'        => 'Site visit leads',
		'public'       => false,
		'show_ui'      => true,
		'menu_icon'    => 'dashicons-car',
		'supports'     => [ 'title', 'editor' ],
		'map_meta_cap' => true,
		'capabilities' => [ 'create_posts' => 'do_not_allow' ],
	] );
} );

/* ---------- AJAX: POST admin-ajax.php action=pc_visit ---------- */

add_action( 'wp_ajax_pc_visit', 'pc_visit_ajax' );
add_action( 'wp_ajax_nopriv_pc_visit', 'pc_visit_ajax' );

function pc_visit_fail( string $message, string $field = '', int $status = 400 ): void {
	wp_send_json_error( [ 'message' => $message, 'field' => $field ], $status );
}

function pc_visit_pick( array $p, string $key, array $allowed ): string {
	$v = isset( $p[ $key ] ) ? (string) $p[ $key ] : '';
	return in_array( $v, $allowed, true ) ? $v : '';
}

/* shortcut: fixed-window counter in a transient (5 step-1 posts per IP per hour); move to the WAF/Cloudflare rate limiting if abused. */
function pc_visit_rate_ok(): bool {
	// Origin sits behind Cloudflare, so REMOTE_ADDR is a Cloudflare IP. Trust the header only because of that.
	$ip  = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? '';
	$key = 'pc_visit_rl_' . md5( $ip );
	$n   = (int) get_transient( $key );
	if ( $n >= 5 ) {
		return false;
	}
	set_transient( $key, $n + 1, HOUR_IN_SECONDS );
	return true;
}

function pc_visit_ajax(): void {
	if ( ! check_ajax_referer( 'pc_visit', 'nonce', false ) ) {
		pc_visit_fail( 'This page has expired. Please refresh it and try again.', '', 403 );
	}
	$p = wp_unslash( $_POST );

	// Honeypot: bots fill the hidden "website" field. Look successful, store nothing.
	if ( ! empty( $p['website'] ) ) {
		wp_send_json_success( [ 'ref' => 'PO-' . wp_rand( 10000, 99999 ), 'token' => wp_generate_password( 20, false ), 'band' => 'cold' ] );
	}

	( (int) ( $p['stage'] ?? 1 ) === 2 ) ? pc_visit_stage2( $p ) : pc_visit_stage1( $p );
}

function pc_visit_stage1( array $p ): void {
	if ( ! pc_visit_rate_ok() ) {
		pc_visit_fail( 'We have received several requests from your connection. Please call us on 1800 121 411111.', '', 429 );
	}
	$name = sanitize_text_field( $p['name'] ?? '' );
	if ( mb_strlen( $name ) < 2 || mb_strlen( $name ) > 80 ) {
		pc_visit_fail( 'Please enter your name.', 'name' );
	}
	$phone = pc_visit_normalize_phone( (string) ( $p['phone'] ?? '' ) );
	if ( ! $phone ) {
		pc_visit_fail( 'Please enter a 10-digit Indian mobile number, for example 98765 43210.', 'phone' );
	}

	$lead = [
		'stage'     => 'partial',
		'name'      => $name,
		'phone'     => $phone,
		'consent'   => ( $p['consent'] ?? '' ) === 'yes',
		'offer_id'  => PC_VISIT_OFFER,
		'page_url'  => esc_url_raw( $p['page_url'] ?? '' ),
		'device'    => pc_visit_pick( $p, 'device', [ 'mobile', 'tablet', 'desktop' ] ),
		'client_ts' => sanitize_text_field( $p['client_ts'] ?? '' ),
		'server_ts' => current_time( 'c' ),
	];
	foreach ( [ 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content' ] as $k ) {
		$lead[ $k ] = mb_substr( sanitize_text_field( $p[ $k ] ?? '' ), 0, 100 );
	}

	$id = wp_insert_post( [
		'post_type'    => 'pc_visit_lead',
		'post_status'  => 'private',
		'post_title'   => "[partial] $name · $phone",
		'post_content' => pc_visit_summary( $lead ),
	], true );
	if ( is_wp_error( $id ) ) {
		error_log( 'pc_visit: could not save lead: ' . $id->get_error_message() );
		pc_visit_fail( 'Sorry, we could not save this. Please try again, or call us on 1800 121 411111.', '', 500 );
	}
	$token = wp_generate_password( 20, false );
	update_post_meta( $id, '_pc_lead', $lead );
	update_post_meta( $id, '_pc_token', hash( 'sha256', $token ) );

	// If step 2 never arrives, sales still gets the partial lead by email after 30 minutes.
	wp_schedule_single_event( time() + 30 * MINUTE_IN_SECONDS, 'pc_visit_partial_check', [ $id ] );
	do_action( 'pc_visit_lead', $lead, 'partial', $id );

	wp_send_json_success( [ 'ref' => 'PO-' . $id, 'token' => $token ] );
}

function pc_visit_stage2( array $p ): void {
	$id    = (int) preg_replace( '/\D/', '', (string) ( $p['ref'] ?? '' ) );
	$lead  = $id ? get_post_meta( $id, '_pc_lead', true ) : null;
	$valid = is_array( $lead ) && get_post_type( $id ) === 'pc_visit_lead'
		&& hash_equals( (string) get_post_meta( $id, '_pc_token', true ), hash( 'sha256', (string) ( $p['token'] ?? '' ) ) );
	if ( ! $valid ) {
		pc_visit_fail( 'We could not find your request. Please refresh the page and start again.' );
	}
	if ( $lead['stage'] === 'complete' ) { // double submit: answer the same way, change nothing
		wp_send_json_success( [ 'ref' => 'PO-' . $id, 'band' => $lead['band'] ] );
	}

	$area = sanitize_text_field( $p['pickup_area'] ?? '' );
	if ( mb_strlen( $area ) < 2 || mb_strlen( $area ) > 120 ) {
		pc_visit_fail( 'Please enter your pickup area or pincode.', 'pickup_area' );
	}
	$today = wp_date( 'Y-m-d' );
	$date  = (string) ( $p['visit_date'] ?? '' );
	if ( ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $date ) || $date <= $today || $date > wp_date( 'Y-m-d', time() + 90 * DAY_IN_SECONDS ) ) {
		pc_visit_fail( 'Please choose a date between tomorrow and the next 3 months.', 'visit_date' );
	}

	$serviceable = preg_match( '/\b\d{6}\b/', $area, $m ) && preg_match( '/' . pc_visit_pincode_re() . '/', $m[0] );
	$people      = (int) ( $p['people'] ?? 0 );
	$lead        = array_merge( $lead, [
		'stage'          => 'complete',
		'pickup_area'    => $area,
		'pincode_likely' => (bool) $serviceable,
		'visit_date'     => $date,
		'slot'           => pc_visit_pick( $p, 'slot', [ 'morning', 'midday', 'evening' ] ),
		'visit_for'      => pc_visit_pick( $p, 'visit_for', [ 'self', 'parent', 'other' ] ),
		'people'         => $people >= 1 && $people <= 5 ? $people : '',
		'timeline'       => pc_visit_pick( $p, 'timeline', [ 'now', '1-3m', 'exploring' ] ),
		'budget'         => pc_visit_pick( $p, 'budget', [ '98l-plus', 'below-98l', 'unsure' ] ),
		'comfort'        => mb_substr( sanitize_textarea_field( $p['comfort'] ?? '' ), 0, 500 ),
		'completed_ts'   => current_time( 'c' ),
	] );
	$lead['score'] = pc_visit_score( $lead, (bool) $serviceable, $today );
	$lead['band']  = pc_visit_band( $lead['score'] );

	update_post_meta( $id, '_pc_lead', $lead );
	wp_update_post( [
		'ID'           => $id,
		'post_title'   => sprintf( '[%s %d/8] %s · %s', $lead['band'], $lead['score'], $lead['name'], $lead['phone'] ),
		'post_content' => pc_visit_summary( $lead ),
	] );
	pc_visit_mail( $id, $lead );
	do_action( 'pc_visit_lead', $lead, 'complete', $id );

	wp_send_json_success( [ 'ref' => 'PO-' . $id, 'band' => $lead['band'] ] );
}

add_action( 'pc_visit_partial_check', function ( $id ) {
	$lead = get_post_meta( (int) $id, '_pc_lead', true );
	if ( is_array( $lead ) && $lead['stage'] === 'partial' ) {
		pc_visit_mail( (int) $id, $lead );
	}
} );

/* ---------- Sales email ---------- */

function pc_visit_summary( array $lead ): string {
	$labels = [
		'name' => 'Name', 'phone' => 'Phone', 'pickup_area' => 'Pickup area', 'pincode_likely' => 'Pincode looks serviceable',
		'visit_date' => 'Preferred date', 'slot' => 'Time slot', 'visit_for' => 'Visit for', 'people' => 'People visiting',
		'timeline' => 'Buying timeline', 'budget' => 'Budget', 'comfort' => 'Comfort notes', 'score' => 'Lead score (0-8)',
		'band' => 'Band', 'consent' => 'Marketing consent', 'utm_source' => 'utm_source', 'utm_medium' => 'utm_medium',
		'utm_campaign' => 'utm_campaign', 'utm_term' => 'utm_term', 'utm_content' => 'utm_content', 'page_url' => 'Page',
		'device' => 'Device', 'offer_id' => 'Offer', 'server_ts' => 'Step 1 at', 'completed_ts' => 'Step 2 at',
	];
	$out = [];
	foreach ( $labels as $k => $label ) {
		if ( ! isset( $lead[ $k ] ) || $lead[ $k ] === '' ) {
			continue;
		}
		$v     = is_bool( $lead[ $k ] ) ? ( $lead[ $k ] ? 'yes' : 'no' ) : $lead[ $k ];
		$out[] = "$label: $v";
	}
	return implode( "\n", $out );
}

function pc_visit_mail( int $id, array $lead ): void {
	$to      = apply_filters( 'pc_visit_sales_email', get_option( 'admin_email' ) );
	$subject = $lead['stage'] === 'complete'
		? sprintf( '[%s %d/8] Chauffeur site visit: %s, %s', strtoupper( $lead['band'] ), $lead['score'], $lead['name'], $lead['visit_date'] )
		: sprintf( '[PARTIAL] Site visit enquiry, step 2 not finished: %s', $lead['name'] );
	$body    = pc_visit_summary( $lead ) . "\n\nOpen in WordPress: " . admin_url( 'post.php?post=' . $id . '&action=edit' );
	if ( ! wp_mail( $to, $subject, $body ) ) {
		error_log( 'pc_visit: sales email failed for lead ' . $id ); // lead is still saved in wp-admin
	}
}
