<?php
class SeoAutofix_Fixer_Engine {
    private $client;

    public function __construct(SeoAutofix_API_Client $client) {
        $this->client = $client;
    }

    public function fetch_and_apply() {
        // First generate new fixes from latest audit
        $this->client->generate_fixes();

        // Then fetch pending fixes
        $fixes = $this->client->get_fixes('pending');
        if (empty($fixes)) return;

        $active_fixes = get_option('seoautofix_active_fixes', []);
        $applied_count = 0;

        foreach ($fixes as $fix) {
            $fix_type = $fix['fix_type'] ?? '';

            // Skip heading changes — flag for manual review
            if ($fix_type === 'heading_structure') {
                $this->client->update_fix_status($fix['id'], 'manual_review');
                continue;
            }

            // Apply fix based on type
            $success = false;

            switch ($fix_type) {
                case 'meta_description':
                case 'meta_title':
                    $success = $this->apply_meta_fix($fix);
                    break;

                case 'alt_text':
                    $success = $this->apply_alt_text($fix);
                    break;

                case 'schema_markup':
                case 'canonical_tag':
                case 'open_graph':
                    // These are applied via wp_head/wp_footer hooks
                    $fix['status'] = 'applied';
                    $active_fixes[$fix['id']] = $fix;
                    $success = true;
                    break;

                default:
                    $this->client->update_fix_status($fix['id'], 'skipped');
                    continue 2;
            }

            if ($success) {
                $this->client->update_fix_status($fix['id'], 'applied');
                $applied_count++;
            } else {
                $this->client->update_fix_status($fix['id'], 'failed', 'Could not apply fix');
            }
        }

        update_option('seoautofix_active_fixes', $active_fixes);
        update_option('seoautofix_last_sync', current_time('mysql'));
        update_option('seoautofix_last_applied', $applied_count);
    }

    private function apply_meta_fix($fix) {
        $target = $fix['target'] ?? [];
        $page_url = $target['page_url'] ?? '';
        $value = $fix['suggested_value'] ?? '';
        if (!$value) return false;

        // Find the post/page matching the URL
        $post_id = url_to_postid($page_url);
        if (!$post_id) {
            // Try homepage
            if ($page_url === home_url('/') || $page_url === home_url()) {
                $post_id = get_option('page_on_front');
            }
        }
        if (!$post_id) return false;

        $fix_type = $fix['fix_type'];

        // Try Yoast
        if (defined('WPSEO_VERSION')) {
            $meta_key = $fix_type === 'meta_title' ? '_yoast_wpseo_title' : '_yoast_wpseo_metadesc';
            $existing = get_post_meta($post_id, $meta_key, true);
            if (!$existing) {
                update_post_meta($post_id, $meta_key, $value);
                return true;
            }
            return false;
        }

        // Try RankMath
        if (class_exists('RankMath')) {
            $meta_key = $fix_type === 'meta_title' ? 'rank_math_title' : 'rank_math_description';
            $existing = get_post_meta($post_id, $meta_key, true);
            if (!$existing) {
                update_post_meta($post_id, $meta_key, $value);
                return true;
            }
            return false;
        }

        // No SEO plugin — store in active fixes for wp_head injection
        $active_fixes = get_option('seoautofix_active_fixes', []);
        $fix['status'] = 'applied';
        $active_fixes[$fix['id']] = $fix;
        update_option('seoautofix_active_fixes', $active_fixes);
        return true;
    }

    private function apply_alt_text($fix) {
        $target = $fix['target'] ?? [];
        $image_src = $target['image_src'] ?? '';
        $alt_text = $fix['suggested_value'] ?? '';
        if (!$image_src || !$alt_text) return false;

        // Find attachment by URL
        global $wpdb;
        $attachment_id = $wpdb->get_var($wpdb->prepare(
            "SELECT ID FROM $wpdb->posts WHERE guid = %s AND post_type = 'attachment' LIMIT 1",
            $image_src
        ));

        if (!$attachment_id) {
            // Try by filename
            $filename = basename(parse_url($image_src, PHP_URL_PATH));
            $attachment_id = $wpdb->get_var($wpdb->prepare(
                "SELECT ID FROM $wpdb->posts WHERE guid LIKE %s AND post_type = 'attachment' LIMIT 1",
                '%' . $wpdb->esc_like($filename)
            ));
        }

        if ($attachment_id) {
            $existing = get_post_meta($attachment_id, '_wp_attachment_image_alt', true);
            if (!$existing) {
                update_post_meta($attachment_id, '_wp_attachment_image_alt', $alt_text);
                return true;
            }
        }

        return false;
    }
}
