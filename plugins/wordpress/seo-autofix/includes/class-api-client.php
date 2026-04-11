<?php
class SeoAutofix_API_Client {
    private $api_key;
    private $site_id;
    private $api_base;

    public function __construct($api_key, $site_id) {
        $this->api_key = $api_key;
        $this->site_id = $site_id;
        $this->api_base = 'https://seo.cgmimm.com/api/v1';
    }

    public function get_fixes($status = 'pending') {
        $url = $this->api_base . '/sites/' . $this->site_id . '/fixes?status=' . $status;
        $response = wp_remote_get($url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json',
            ],
            'timeout' => 30,
        ]);

        if (is_wp_error($response)) return [];
        $body = json_decode(wp_remote_retrieve_body($response), true);
        return $body['fixes'] ?? [];
    }

    public function generate_fixes() {
        $url = $this->api_base . '/sites/' . $this->site_id . '/fixes';
        $response = wp_remote_post($url, [
            'headers' => [
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json',
            ],
            'timeout' => 60,
        ]);

        if (is_wp_error($response)) return 0;
        $body = json_decode(wp_remote_retrieve_body($response), true);
        return $body['generated'] ?? 0;
    }

    public function update_fix_status($fix_id, $status, $error_message = '') {
        $url = $this->api_base . '/sites/' . $this->site_id . '/fixes/' . $fix_id . '/status';
        wp_remote_request($url, [
            'method' => 'PUT',
            'headers' => [
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json',
            ],
            'body' => json_encode([
                'status' => $status,
                'applied_by' => 'wordpress_plugin',
                'plugin_version' => SEOAUTOFIX_VERSION,
                'error_message' => $error_message,
            ]),
            'timeout' => 15,
        ]);
    }
}
