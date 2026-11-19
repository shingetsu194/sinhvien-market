<?php

namespace App\Services\Matching;

/**
 * Gemini Embedding (default gemini-embedding-2, 768d): text and image vectors
 * in one space. Vectors are L2-normalised and tagged with modelKey() so
 * vectors from different models/dimensions are never mixed.
 *
 * Config (.env): GEMINI_EMBEDDING_API_KEYS (comma separated, tried in order on
 * 429) or the existing GEMINI_API_KEY; GEMINI_EMBEDDING_MODEL;
 * GEMINI_EMBEDDING_DIM. The key goes in the x-goog-api-key header, never in
 * the URL. Failures return null and are logged without secrets or content.
 */
class GeminiEmbeddingService
{
    private const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/%s:embedContent';

    private string $model;
    private int $dimensions;
    /** @var list<string> */
    private array $keys;
    private ?string $lastError = null;

    public function __construct()
    {
        $this->model = self::env('GEMINI_EMBEDDING_MODEL') ?: 'gemini-embedding-2';
        $this->dimensions = (int)(self::env('GEMINI_EMBEDDING_DIM') ?: 768);
        $raw = self::env('GEMINI_EMBEDDING_API_KEYS') ?: self::env('GEMINI_API_KEY');
        $this->keys = array_values(array_filter(array_map('trim', explode(',', (string)$raw))));
    }

    public function modelKey(): string
    {
        return $this->model . '-d' . $this->dimensions;
    }

    public function available(): bool
    {
        return $this->keys !== [];
    }

    public function lastError(): ?string
    {
        return $this->lastError;
    }

    /** @param string $taskType RETRIEVAL_QUERY for buyer text, RETRIEVAL_DOCUMENT for listings */
    public function embedText(string $text, string $taskType): ?array
    {
        return $this->embed([['text' => mb_substr($text, 0, 4000)]], $taskType);
    }

    public function embedImage(string $bytes, string $mime): ?array
    {
        return $this->embed([['inline_data' => ['mime_type' => $mime, 'data' => base64_encode($bytes)]]], null);
    }

    private function embed(array $parts, ?string $taskType): ?array
    {
        $this->lastError = null;
        if (!$this->available()) {
            $this->lastError = 'not_configured';
            return null;
        }
        $payload = ['model' => 'models/' . $this->model, 'content' => ['parts' => $parts],
            'outputDimensionality' => $this->dimensions];
        if ($taskType !== null) {
            $payload['taskType'] = $taskType;
        }
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        foreach ($this->keys as $key) {
            $ch = curl_init(sprintf(self::ENDPOINT, rawurlencode($this->model)));
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $body,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $key],
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 15,
                CURLOPT_SSL_VERIFYPEER => true,
            ]);
            $response = curl_exec($ch);
            $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
            if ($response === false) {
                $this->lastError = 'network';
                error_log(sprintf('Gemini embedding failed: cURL %d %s%s', curl_errno($ch), curl_error($ch),
                    curl_errno($ch) === 60 ? ' (set curl.cainfo/openssl.cafile in php.ini)' : ''));
                return null;
            }
            if ($status === 429) {
                $this->lastError = 'rate_limited';
                continue; // next key, if any
            }
            $data = json_decode((string)$response, true);
            $values = $data['embedding']['values'] ?? null;
            if ($status >= 400 || !is_array($values) || $values === []) {
                $this->lastError = 'api_error';
                error_log(sprintf('Gemini embedding failed: HTTP %d %s', $status,
                    preg_replace('/[^A-Z_]/', '', (string)($data['error']['status'] ?? ''))));
                return null;
            }
            return self::normalise(array_map('floatval', $values));
        }
        error_log('Gemini embedding failed: rate limited on every configured key');
        return null;
    }

    public static function cosine(array $a, array $b): float
    {
        $n = min(count($a), count($b));
        if ($n === 0 || count($a) !== count($b)) {
            return 0.0;
        }
        $dot = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $dot += $a[$i] * $b[$i];
        }
        return $dot; // inputs are L2-normalised
    }

    private static function normalise(array $vector): array
    {
        $norm = sqrt(array_sum(array_map(static fn(float $v): float => $v * $v, $vector)));
        return $norm > 1e-12 ? array_map(static fn(float $v): float => $v / $norm, $vector) : $vector;
    }

    private static function env(string $name): string
    {
        $value = $_ENV[$name] ?? getenv($name);
        return is_string($value) ? trim($value) : '';
    }
}
