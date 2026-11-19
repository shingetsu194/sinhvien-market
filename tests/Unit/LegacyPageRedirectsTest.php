<?php

namespace Tests\Unit;

use Core\LegacyPageRedirects;
use PHPUnit\Framework\TestCase;

class LegacyPageRedirectsTest extends TestCase
{
    public function test_maps_legacy_page_routes_to_existing_next_routes(): void
    {
        self::assertSame('/', LegacyPageRedirects::targetPath(''));
        self::assertSame('/dashboard', LegacyPageRedirects::targetPath('dashboard'));
        self::assertSame('/leaderboard', LegacyPageRedirects::targetPath('leaderboard'));
        self::assertSame('/products/create', LegacyPageRedirects::targetPath('products/create'));
        self::assertSame('/my-listings', LegacyPageRedirects::targetPath('products/my'));
        self::assertSame('/transactions', LegacyPageRedirects::targetPath('transactions/history'));
        self::assertSame('/transactions/42/payment', LegacyPageRedirects::targetPath('transactions/bank', ['id' => '42']));
        self::assertSame('/transactions', LegacyPageRedirects::targetPath('transactions/bank'));
        self::assertSame('/admin/giveaway_spin', LegacyPageRedirects::targetPath('admin/giveaway_spin'));
    }

    public function test_maps_legacy_query_id_to_next_dynamic_pages(): void
    {
        self::assertSame('/products/42', LegacyPageRedirects::targetPath('products/show', ['id' => '42']));
        self::assertSame('/chat/7', LegacyPageRedirects::targetPath('chat/show', ['id' => '7']));
        self::assertSame('/users/9', LegacyPageRedirects::targetPath('users/profile', ['id' => '9']));
        self::assertSame(
            '/transactions/42/payment?tab=bank',
            LegacyPageRedirects::location('/transactions/42/payment', ['id' => '42', 'tab' => 'bank'])
        );
        self::assertSame('/products', LegacyPageRedirects::targetPath('products/show'));
        self::assertSame('/chat', LegacyPageRedirects::targetPath('chat/show', ['id' => '../']));
    }

    public function test_unmigrated_backend_routes_are_not_redirected(): void
    {
        self::assertNull(LegacyPageRedirects::targetPath('api/marketplace/products'));
        self::assertNull(LegacyPageRedirects::targetPath('products/image'));
        self::assertNull(LegacyPageRedirects::targetPath('transactions/zalopay-return'));
        self::assertNull(LegacyPageRedirects::targetPath('logout'));
    }

    public function test_legacy_form_posts_point_to_their_next_pages(): void
    {
        self::assertSame('/login', LegacyPageRedirects::legacyPostPage('login'));
        self::assertSame('/admin-login', LegacyPageRedirects::legacyPostPage('admin-login'));
        self::assertSame('/register', LegacyPageRedirects::legacyPostPage('register'));
        self::assertSame('/verify-otp', LegacyPageRedirects::legacyPostPage('verify-otp'));
        self::assertSame('/forgot-password', LegacyPageRedirects::legacyPostPage('forgot-password'));
        self::assertSame('/reset-password', LegacyPageRedirects::legacyPostPage('reset-password'));
        self::assertSame('/products/create', LegacyPageRedirects::legacyPostPage('products/create'));
    }

    public function test_active_backend_posts_are_not_marked_as_legacy_forms(): void
    {
        self::assertNull(LegacyPageRedirects::legacyPostPage('transactions/bank-confirm'));
        self::assertNull(LegacyPageRedirects::legacyPostPage('api/user/transactions/checkout'));
        self::assertNull(LegacyPageRedirects::legacyPostPage('transactions/momo-ipn'));
    }

    public function test_location_preserves_query_and_uses_configured_base_url(): void
    {
        self::assertSame(
            'https://frontend.example.test/products/42?sort=recent',
            LegacyPageRedirects::location(
                '/products/42',
                ['id' => '42', 'sort' => 'recent', 'url' => 'products/show'],
                'https://frontend.example.test/'
            )
        );
    }

    public function test_detects_same_host_redirect_back_to_the_requested_route(): void
    {
        // No NEXT_APP_URL: '/login' requested from PHP would bounce to itself forever.
        self::assertTrue(LegacyPageRedirects::isSelfRedirect('/login', 'login'));
        self::assertTrue(LegacyPageRedirects::isSelfRedirect('/', ''));
        self::assertTrue(LegacyPageRedirects::isSelfRedirect('/profile?tab=security', 'profile'));
    }

    public function test_allows_redirects_that_leave_the_requested_route(): void
    {
        self::assertFalse(LegacyPageRedirects::isSelfRedirect('/my-listings', 'products/my'));
        self::assertFalse(LegacyPageRedirects::isSelfRedirect('/products/42', 'products/show'));
        self::assertFalse(LegacyPageRedirects::isSelfRedirect('http://localhost:3000/login', 'login'));
        self::assertFalse(LegacyPageRedirects::isSelfRedirect('//evil.example/login', 'login'));
    }

    public function test_unsafe_base_url_falls_back_to_same_host_path(): void
    {
        self::assertSame(
            '/profile?tab=security',
            LegacyPageRedirects::location('/profile', ['tab' => 'security'], 'javascript:alert(1)')
        );
    }
}
