<?php

/**
 * Precompute Gemini text/image embeddings for all active listings, so smart
 * search does not embed listings on the user's request path.
 * Stale vectors (title/description/image changed) are detected by content hash.
 *   php scripts/index-marketplace-embeddings.php
 */

declare(strict_types=1);

define('ROOT', dirname(__DIR__));
define('APP_PATH', ROOT . '/app');
define('CORE_PATH', ROOT . '/core');
define('CONFIG_PATH', ROOT . '/config');

spl_autoload_register(static function (string $class): void {
    $prefixes = ['App\\Models\\' => APP_PATH . '/models/', 'App\\Services\\' => APP_PATH . '/services/',
        'Core\\' => CORE_PATH . '/', 'Config\\' => CONFIG_PATH . '/'];
    foreach ($prefixes as $prefix => $dir) {
        if (str_starts_with($class, $prefix)) {
            $file = $dir . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) {
                require_once $file;
            }
            return;
        }
    }
});

\Config\Database::getInstance(); // loads .env into $_ENV
$t0 = microtime(true);
$result = (new \App\Services\Matching\SmartSearchService())->indexAll();
if ($result['mode'] === 'not_configured') {
    fwrite(STDERR, "Gemini embedding is not configured (set GEMINI_EMBEDDING_API_KEYS or GEMINI_API_KEY).\n");
    exit(1);
}
fwrite(STDOUT, sprintf(
    "%s: %d active listings, %d vectors created, %d listings without a text vector, %.1fs\n",
    $result['modelKey'], $result['candidates'], $result['indexed'], $result['missing'], microtime(true) - $t0
));
exit($result['missing'] > 0 ? 1 : 0);
