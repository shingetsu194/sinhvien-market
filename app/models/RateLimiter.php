<?php

namespace App\Models;

use Core\Model;

/** Fixed-window counter per (bucket, client). Atomic via INSERT ... ON DUPLICATE KEY UPDATE. */
class RateLimiter extends Model
{
    /** Count one hit; true while the client is within $max hits for the current window. */
    public function hit(string $bucket, string $client, int $max, int $windowSeconds): bool
    {
        $window = intdiv(time(), $windowSeconds) * $windowSeconds;
        $key = hash('sha256', $client);
        $this->execute(
            'INSERT INTO api_rate_limits (bucket, client_key, window_start, hits) VALUES (?, ?, ?, 1)
             ON DUPLICATE KEY UPDATE hits = hits + 1',
            [$bucket, $key, $window]
        );
        $hits = $this->count(
            'SELECT hits FROM api_rate_limits WHERE bucket = ? AND client_key = ? AND window_start = ?',
            [$bucket, $key, $window]
        );
        if (random_int(1, 50) === 1) {
            $this->execute('DELETE FROM api_rate_limits WHERE window_start < ?', [time() - 86400]);
        }
        return $hits <= $max;
    }
}
