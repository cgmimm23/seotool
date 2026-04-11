<?php
class SeoAutofix_Settings {
    public static function init() {
        add_action('admin_menu', [__CLASS__, 'add_menu']);
        add_action('admin_init', [__CLASS__, 'register_settings']);
        add_action('admin_post_seoautofix_sync', [__CLASS__, 'manual_sync']);
    }

    public static function add_menu() {
        add_options_page(
            'SEO AutoFix',
            'SEO AutoFix',
            'manage_options',
            'seo-autofix',
            [__CLASS__, 'render_page']
        );
    }

    public static function register_settings() {
        register_setting('seoautofix_settings', 'seoautofix_api_key');
        register_setting('seoautofix_settings', 'seoautofix_site_id');
    }

    public static function manual_sync() {
        if (!current_user_can('manage_options')) wp_die('Unauthorized');
        check_admin_referer('seoautofix_sync');

        $api_key = get_option('seoautofix_api_key', '');
        $site_id = get_option('seoautofix_site_id', '');

        if ($api_key && $site_id) {
            $client = new SeoAutofix_API_Client($api_key, $site_id);
            $engine = new SeoAutofix_Fixer_Engine($client);
            $engine->fetch_and_apply();
        }

        wp_redirect(admin_url('options-general.php?page=seo-autofix&synced=1'));
        exit;
    }

    public static function render_page() {
        $api_key = get_option('seoautofix_api_key', '');
        $site_id = get_option('seoautofix_site_id', '');
        $last_sync = get_option('seoautofix_last_sync', 'Never');
        $last_applied = get_option('seoautofix_last_applied', 0);
        $active_fixes = get_option('seoautofix_active_fixes', []);
        $synced = isset($_GET['synced']);
        ?>
        <div class="wrap">
            <h1>SEO AutoFix <span style="color:#68ccd1;font-size:14px;">by CGMIMM</span></h1>

            <?php if ($synced): ?>
                <div class="notice notice-success"><p>Sync complete! <?php echo intval($last_applied); ?> fixes applied.</p></div>
            <?php endif; ?>

            <form method="post" action="options.php">
                <?php settings_fields('seoautofix_settings'); ?>
                <table class="form-table">
                    <tr>
                        <th scope="row">API Key</th>
                        <td>
                            <input type="password" name="seoautofix_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text">
                            <p class="description">Your API key from seo.cgmimm.com → Settings → API Keys</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Site ID</th>
                        <td>
                            <input type="text" name="seoautofix_site_id" value="<?php echo esc_attr($site_id); ?>" class="regular-text">
                            <p class="description">Your site ID from the SEO dashboard</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button('Save Settings'); ?>
            </form>

            <hr>

            <h2>Status</h2>
            <table class="widefat" style="max-width:600px;">
                <tr><td><strong>Last Sync</strong></td><td><?php echo esc_html($last_sync); ?></td></tr>
                <tr><td><strong>Fixes Applied Last Sync</strong></td><td><?php echo intval($last_applied); ?></td></tr>
                <tr><td><strong>Active Fixes</strong></td><td><?php echo count($active_fixes); ?></td></tr>
                <tr><td><strong>Connection</strong></td><td><?php echo ($api_key && $site_id) ? '<span style="color:green;">Connected</span>' : '<span style="color:red;">Not configured</span>'; ?></td></tr>
            </table>

            <br>

            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <?php wp_nonce_field('seoautofix_sync'); ?>
                <input type="hidden" name="action" value="seoautofix_sync">
                <?php submit_button('Sync & Apply Fixes Now', 'secondary'); ?>
            </form>

            <?php if (!empty($active_fixes)): ?>
                <h2>Active Fixes</h2>
                <table class="widefat striped">
                    <thead>
                        <tr><th>Type</th><th>Page</th><th>Value</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        <?php foreach ($active_fixes as $fix): ?>
                            <tr>
                                <td><?php echo esc_html($fix['fix_type'] ?? ''); ?></td>
                                <td><?php echo esc_html($fix['page_url'] ?? ''); ?></td>
                                <td style="max-width:300px;overflow:hidden;text-overflow:ellipsis;"><?php echo esc_html(substr($fix['suggested_value'] ?? '', 0, 100)); ?></td>
                                <td><span style="color:green;">Applied</span></td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            <?php endif; ?>
        </div>
        <?php
    }
}
