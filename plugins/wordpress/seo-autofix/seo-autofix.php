<?php
/**
 * Plugin Name: SEO AutoFix by CGMIMM
 * Description: AI-powered SEO auto-fixer. Connects to your AI SEO dashboard and automatically applies fixes to your WordPress site.
 * Version: 1.0.0
 * Author: CGMIMM
 * Author URI: https://cgmimm.com
 */

if (!defined('ABSPATH')) exit;

define('SEOAUTOFIX_VERSION', '1.0.0');
define('SEOAUTOFIX_PLUGIN_DIR', plugin_dir_path(__FILE__));

require_once SEOAUTOFIX_PLUGIN_DIR . 'includes/class-api-client.php';
require_once SEOAUTOFIX_PLUGIN_DIR . 'includes/class-fixer-engine.php';
require_once SEOAUTOFIX_PLUGIN_DIR . 'includes/class-settings.php';

// Initialize
add_action('init', function() {
    SeoAutofix_Settings::init();
});

// Register cron
register_activation_hook(__FILE__, function() {
    if (!wp_next_scheduled('seoautofix_sync_fixes')) {
        wp_schedule_event(time(), 'twicedaily', 'seoautofix_sync_fixes');
    }
});

register_deactivation_hook(__FILE__, function() {
    wp_clear_scheduled_hook('seoautofix_sync_fixes');
});

// Cron: fetch and apply fixes
add_action('seoautofix_sync_fixes', function() {
    $api_key = get_option('seoautofix_api_key', '');
    $site_id = get_option('seoautofix_site_id', '');
    if (!$api_key || !$site_id) return;

    $client = new SeoAutofix_API_Client($api_key, $site_id);
    $engine = new SeoAutofix_Fixer_Engine($client);
    $engine->fetch_and_apply();
});

// Apply active fixes on frontend
add_action('wp_head', function() {
    $fixes = get_option('seoautofix_active_fixes', []);
    if (empty($fixes)) return;

    $current_url = home_url($_SERVER['REQUEST_URI']);

    foreach ($fixes as $fix) {
        if ($fix['status'] !== 'applied') continue;

        // Match page URL loosely
        $fix_path = parse_url($fix['page_url'], PHP_URL_PATH) ?: '/';
        $current_path = parse_url($current_url, PHP_URL_PATH) ?: '/';
        if ($fix_path !== '/' && $fix_path !== $current_path) continue;

        switch ($fix['fix_type']) {
            case 'meta_description':
                if (!seoautofix_has_meta_description()) {
                    echo '<meta name="description" content="' . esc_attr($fix['suggested_value']) . '">' . "\n";
                }
                break;

            case 'canonical_tag':
                if (!seoautofix_has_canonical()) {
                    echo '<link rel="canonical" href="' . esc_url($fix['suggested_value']) . '">' . "\n";
                }
                break;

            case 'open_graph':
                $og_data = json_decode($fix['suggested_value'], true);
                if (is_array($og_data)) {
                    foreach ($og_data as $prop => $val) {
                        echo '<meta property="' . esc_attr($prop) . '" content="' . esc_attr($val) . '">' . "\n";
                    }
                }
                break;
        }
    }
}, 1);

add_action('wp_footer', function() {
    $fixes = get_option('seoautofix_active_fixes', []);
    if (empty($fixes)) return;

    foreach ($fixes as $fix) {
        if ($fix['status'] !== 'applied' || $fix['fix_type'] !== 'schema_markup') continue;
        echo '<script type="application/ld+json">' . $fix['suggested_value'] . '</script>' . "\n";
    }
}, 99);

// Helper: check if meta description already exists
function seoautofix_has_meta_description() {
    // Check Yoast
    if (defined('WPSEO_VERSION')) {
        $desc = get_post_meta(get_the_ID(), '_yoast_wpseo_metadesc', true);
        if ($desc) return true;
    }
    // Check RankMath
    if (class_exists('RankMath')) {
        $desc = get_post_meta(get_the_ID(), 'rank_math_description', true);
        if ($desc) return true;
    }
    return false;
}

function seoautofix_has_canonical() {
    if (defined('WPSEO_VERSION')) return true; // Yoast handles canonical
    if (class_exists('RankMath')) return true;
    return false;
}
