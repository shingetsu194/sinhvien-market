<?php

namespace Core;

/**
 * Router - Ánh xạ URL sang Controller@Action
 * Hỗ trợ GET và POST, tham số query string (?id=)
 */
class Router
{
    /** @var array<string, array{controller: string, action: string}> */
    private array $routes = [];

    // ─── Đăng ký routes ──────────────────────────────────────────────────────

    public function get(string $path, string $controller, string $action): void
    {
        $this->routes['GET'][$path] = compact('controller', 'action');
    }

    public function post(string $path, string $controller, string $action): void
    {
        $this->routes['POST'][$path] = compact('controller', 'action');
    }

    public function put(string $path, string $controller, string $action): void
    {
        $this->routes['PUT'][$path] = compact('controller', 'action');
    }

    public function delete(string $path, string $controller, string $action): void
    {
        $this->routes['DELETE'][$path] = compact('controller', 'action');
    }

    // ─── Dispatch ────────────────────────────────────────────────────────────

    public function dispatch(): void
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $url    = $this->parseUrl();

        if ($method === 'GET') {
            $targetPath = LegacyPageRedirects::targetPath($url, $_GET);
            if ($targetPath !== null) {
                $nextBaseUrl = $_ENV['NEXT_APP_URL'] ?? null;
                if (!is_string($nextBaseUrl) || trim($nextBaseUrl) === '') {
                    $nextBaseUrl = getenv('NEXT_APP_URL');
                }
                if (!is_string($nextBaseUrl)) {
                    $nextBaseUrl = null;
                }
                $location = LegacyPageRedirects::location($targetPath, $_GET, $nextBaseUrl);
                if (LegacyPageRedirects::isSelfRedirect($location, $url)) {
                    error_log('Legacy page redirect would loop for /' . $url . '; set NEXT_APP_URL to the Next.js origin.');
                    http_response_code(503);
                    header('Content-Type: text/plain; charset=utf-8');
                    header('Cache-Control: no-store');
                    echo "Giao diện web chạy trên Next.js. Hãy mở địa chỉ Next.js (ví dụ http://localhost:3000)"
                        . " hoặc đặt NEXT_APP_URL trong .env của backend PHP.\n";
                    exit;
                }
                header('Location: ' . $location, true, 302);
                exit;
            }
        }

        if ($method === 'POST') {
            $nextPage = LegacyPageRedirects::legacyPostPage($url);
            if ($nextPage !== null) {
                http_response_code(410);
                header('Content-Type: application/json; charset=utf-8');
                header('Cache-Control: no-store');
                header('X-Content-Type-Options: nosniff');
                echo json_encode([
                    'success' => false,
                    'error' => [
                        'code' => 'LEGACY_ENDPOINT_MOVED',
                        'message' => 'Biểu mẫu này đã được chuyển sang giao diện Next.js.',
                        'meta' => ['nextPage' => $nextPage],
                    ],
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                return;
            }
        }

        // Tìm route khớp (bao gồm prefix matching)
        $route = $this->findRoute($method, $url);

        if ($route === null) {
            $this->notFound($url);
            return;
        }

        $controllerClass = 'App\\Controllers\\' . $route['controller'] . 'Controller';
        $action          = $route['action'];

        if (!class_exists($controllerClass)) {
            $this->notFound($url);
            return;
        }

        $controller = new $controllerClass();

        if (!method_exists($controller, $action)) {
            $this->notFound($url);
            return;
        }

        // Truyền tham số từ query string vào action
        $controller->$action();
    }

    // ─── Helpers private ─────────────────────────────────────────────────────

    /**
     * Lấy URL path sạch từ request
     */
    private function parseUrl(): string
    {
        $url = $_GET['url'] ?? '';

        // Hỗ trợ Nginx/Railway khi $_GET['url'] không tồn tại
        if (empty($url) && isset($_SERVER['REQUEST_URI'])) {
            $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '';
            // Fix cho môi trường Laragon (chạy trong thư mục con)
            $scriptName = dirname($_SERVER['SCRIPT_NAME']);
            if ($scriptName !== '/' && $scriptName !== '\\' && strpos($uri, $scriptName) === 0) {
                $uri = substr($uri, strlen($scriptName));
            }
            $url = ltrim($uri, '/');
        }

        // Bỏ query string nếu có trong url param
        $url = strtok($url, '?');
        $url = trim($url, '/');
        // Chỉ cho phép ký tự an toàn trong URL path (a-z, 0-9, -, _, /)
        $url = preg_replace('/[^a-zA-Z0-9\-_\/]/', '', $url);
        return $url;
    }

    /**
     * Tìm route khớp với method + url
     * Hỗ trợ exact match và prefix match (để dùng query string)
     */
    private function findRoute(string $method, string $url): ?array
    {
        // Exact match
        if (isset($this->routes[$method][$url])) {
            return $this->routes[$method][$url];
        }

        // Prefix match (vd: 'products/show' match 'products/show')
        foreach ($this->routes[$method] ?? [] as $pattern => $route) {
            if ($url === $pattern) {
                return $route;
            }

            if (preg_match_all('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', $pattern, $parameterNames)) {
                $quoted = preg_quote($pattern, '#');
                $regex = preg_replace('/\\\\\{[a-zA-Z_][a-zA-Z0-9_]*\\\\\}/', '([^/]+)', $quoted);
                if (preg_match('#^' . $regex . '$#', $url, $matches)) {
                    foreach ($parameterNames[1] as $index => $name) {
                        $_GET[$name] = rawurldecode($matches[$index + 1]);
                    }
                    return $route;
                }
            }
        }

        return null;
    }

    /**
     * Trang 404
     */
    private function notFound(string $url = ''): void
    {
        http_response_code(404);
        if ($url === 'api' || str_starts_with($url, 'api/')) {
            header('Content-Type: application/json; charset=utf-8');
            header('X-Content-Type-Options: nosniff');
            echo json_encode([
                'success' => false,
                'error' => [
                    'code' => 'NOT_FOUND',
                    'message' => 'Không tìm thấy API endpoint.',
                ],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            return;
        }

        $viewFile = ROOT . '/app/views/errors/404.php';
        if (file_exists($viewFile)) {
            require $viewFile;
        } else {
            echo '<h1>404 - Không tìm thấy trang</h1>';
        }
    }
}
