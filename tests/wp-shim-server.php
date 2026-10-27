<?php
/**
 * Local test server: runs the real pc-visit.php handler on top of minimal WordPress stand-ins.
 * Start: php -S localhost:8765 tests/wp-shim-server.php
 * Routes: /ajax (POST), /markup?part=strip|section, /pc-visit/* static assets, /store (dump of saved leads + mail log).
 * Test only. Never deploy.
 */
define( 'ABSPATH', __DIR__ );
const HOUR_IN_SECONDS = 3600, MINUTE_IN_SECONDS = 60, DAY_IN_SECONDS = 86400;
date_default_timezone_set( 'Asia/Kolkata' );
$GLOBALS['STORE'] = sys_get_temp_dir() . '/pc-visit-store.json';

function pcs_db( ?array $set = null ): array {
	if ( $set !== null ) { file_put_contents( $GLOBALS['STORE'], json_encode( $set ) ); return $set; }
	return is_file( $GLOBALS['STORE'] ) ? json_decode( file_get_contents( $GLOBALS['STORE'] ), true ) : [ 'posts' => [], 'meta' => [], 't' => [], 'mail' => [], 'actions' => [] ];
}
function add_action( ...$a ) {}
function apply_filters( $h, $v ) { return $v; }
function do_action( $h, ...$a ) { $d = pcs_db(); $d['actions'][] = [ $h, $a[1] ?? null ]; pcs_db( $d ); }
function register_post_type() {}
function check_ajax_referer( $a, $k ) { return ( $_POST[ $k ] ?? '' ) === 'test'; }
function wp_unslash( $v ) { return $v; }
function wp_send_json_success( $data ) { echo json_encode( [ 'success' => true, 'data' => $data ] ); exit; }
function wp_send_json_error( $data, $status ) { http_response_code( $status ); echo json_encode( [ 'success' => false, 'data' => $data ] ); exit; }
function wp_rand( $a, $b ) { return random_int( $a, $b ); }
function wp_generate_password( $n ) { return bin2hex( random_bytes( $n / 2 ) ); }
function sanitize_text_field( $s ) { return trim( preg_replace( '/[\r\n\t ]+/', ' ', strip_tags( (string) $s ) ) ); }
function sanitize_textarea_field( $s ) { return trim( strip_tags( (string) $s ) ); }
function esc_url_raw( $u ) { return filter_var( $u, FILTER_VALIDATE_URL ) ?: ''; }
function current_time( $f ) { return date( $f ); }
function wp_date( $f, $t = null ) { return date( $f, $t ?? time() ); }
function get_transient( $k ) { return pcs_db()['t'][ $k ] ?? false; }
function set_transient( $k, $v ) { $d = pcs_db(); $d['t'][ $k ] = $v; pcs_db( $d ); }
function wp_insert_post( $p ) { $d = pcs_db(); $id = count( $d['posts'] ) + 101; $d['posts'][ $id ] = $p; pcs_db( $d ); return $id; }
function wp_update_post( $p ) { $d = pcs_db(); $d['posts'][ $p['ID'] ] = array_merge( $d['posts'][ $p['ID'] ], $p ); pcs_db( $d ); }
function is_wp_error( $v ) { return false; }
function update_post_meta( $id, $k, $v ) { $d = pcs_db(); $d['meta'][ $id ][ $k ] = $v; pcs_db( $d ); }
function get_post_meta( $id, $k ) { return pcs_db()['meta'][ $id ][ $k ] ?? ''; }
function get_post_type( $id ) { return isset( pcs_db()['posts'][ $id ] ) ? 'pc_visit_lead' : false; }
function wp_schedule_single_event() {}
function get_option() { return 'sales@example.test'; }
function admin_url( $p = '' ) { return 'http://localhost:8765/wp-admin/' . $p; }
function wp_mail( $to, $s, $b ) { $d = pcs_db(); $d['mail'][] = compact( 'to', 's', 'b' ); pcs_db( $d ); return true; }

require dirname( __DIR__ ) . '/wp-content/mu-plugins/pc-visit.php';

header( 'Access-Control-Allow-Origin: https://www.primuslife.in' );
header( 'Access-Control-Allow-Private-Network: true' ); // Chrome preflight for public page -> localhost
if ( $_SERVER['REQUEST_METHOD'] === 'OPTIONS' ) {
	header( 'Access-Control-Allow-Methods: GET, POST' );
	http_response_code( 204 );
	exit;
}
$path = parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH );
$dir  = dirname( __DIR__ ) . '/wp-content/mu-plugins/pc-visit';
if ( $path === '/ajax' ) {
	header( 'Content-Type: application/json' );
	pc_visit_ajax();
} elseif ( $path === '/olympia' ) {
	// Snapshot of the live page with the build placed where the two template hooks go.
	$html = file_get_contents( __DIR__ . '/olympia-snapshot.html' );
	$part = function ( $f ) use ( $dir ) { ob_start(); include "$dir/$f.php"; return ob_get_clean(); };
	$html = preg_replace( '#<head>#', '<head><base href="https://www.primuslife.in/"><link rel="stylesheet" href="http://localhost:8765/pc-visit/pc-visit.css">', $html, 1 );
	$b    = strpos( $html, '</section>', strpos( $html, 'banner-section home-page' ) );
	$html = substr_replace( $html, $part( 'strip' ), $b + strlen( '</section>' ), 0 );
	$a    = strrpos( substr( $html, 0, strpos( $html, 'id="amenities"' ) ), '<section' );
	$html = substr_replace( $html, $part( 'section' ), $a, 0 );
	$cfg  = json_encode( [ 'ajaxUrl' => 'http://localhost:8765/ajax', 'nonce' => 'test', 'whatsapp' => '919845037078', 'pincodeRe' => '^560\\d{3}$' ] );
	echo str_replace( '</body>', "<script>var pcVisit = $cfg;</script><script defer src=\"http://localhost:8765/pc-visit/pc-visit.js\"></script></body>", $html );
} elseif ( $path === '/markup' ) {
	include $dir . '/' . ( $_GET['part'] === 'strip' ? 'strip' : 'section' ) . '.php';
} elseif ( $path === '/store' ) {
	header( 'Content-Type: application/json' );
	echo json_encode( pcs_db(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE );
} elseif ( preg_match( '#^/pc-visit/(pc-visit\.(css|js))$#', $path, $m ) ) {
	header( 'Content-Type: ' . ( $m[2] === 'css' ? 'text/css' : 'application/javascript' ) );
	readfile( $dir . '/' . $m[1] );
} else {
	http_response_code( 404 );
}
