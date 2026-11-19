<?php

namespace App\Models;

use Core\Model;

/**
 * Buyer REQUEST (nhu cầu tìm mua), owned by one account.
 * "expired" is derived at read time (open + past expires_at), so no cron job
 * is needed to keep statuses correct.
 */
class BuyerRequest extends Model
{
    private const COLUMNS = 'r.id, r.user_id, r.description, r.category_id, c.name AS category_name,
        r.budget_max, r.min_condition, r.building_id, b.name AS building_name, r.allow_exchange,
        r.requirement_flags, (r.image_data IS NOT NULL) AS has_image, r.expires_at, r.created_at,
        CASE WHEN r.status = \'open\' AND r.expires_at < NOW() THEN \'expired\' ELSE r.status END AS status';

    private const FROM = 'FROM marketplace_buyer_requests r
        LEFT JOIN categories c ON c.id = r.category_id
        LEFT JOIN residence_buildings b ON b.id = r.building_id';

    /** @param array $req output of BuyerRequestValidator::validate() */
    public function create(int $userId, array $req): int
    {
        return $this->insert(
            'INSERT INTO marketplace_buyer_requests
                (user_id, description, category_id, budget_max, min_condition, building_id,
                 allow_exchange, requirement_flags, image_mime, image_data, expires_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))',
            [
                $userId,
                $req['description'],
                $req['categoryId'],
                $req['budgetMax'],
                $req['minCondition'],
                $req['buildingId'],
                $req['allowExchange'] ? 1 : 0,
                json_encode((object)$req['flags'], JSON_THROW_ON_ERROR),
                $req['imageMime'],
                $req['imageData'],
                $req['expiresInDays'],
            ]
        );
    }

    public function listForUser(int $userId, int $limit = 50): array
    {
        return array_map([$this, 'decode'], $this->query(
            'SELECT ' . self::COLUMNS . ' ' . self::FROM . '
             WHERE r.user_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT ?',
            [$userId, max(1, min(100, $limit))]
        ));
    }

    public function findForUser(int $id, int $userId): ?array
    {
        $row = $this->queryOne(
            'SELECT ' . self::COLUMNS . ' ' . self::FROM . ' WHERE r.id = ? AND r.user_id = ?',
            [$id, $userId]
        );
        return $row === null ? null : $this->decode($row);
    }

    /** Close an open request owned by the user; false if not found / not open. */
    public function close(int $id, int $userId): bool
    {
        return $this->execute(
            "UPDATE marketplace_buyer_requests SET status = 'closed'
             WHERE id = ? AND user_id = ? AND status = 'open'",
            [$id, $userId]
        ) > 0;
    }

    /** @return array{mime:string, data:string}|null */
    public function imageForUser(int $id, int $userId): ?array
    {
        $row = $this->queryOne(
            'SELECT image_mime, image_data FROM marketplace_buyer_requests
             WHERE id = ? AND user_id = ? AND image_data IS NOT NULL',
            [$id, $userId]
        );
        return $row === null ? null : ['mime' => (string)$row['image_mime'], 'data' => (string)$row['image_data']];
    }

    public function categoryExists(int $id): bool
    {
        return $this->count('SELECT COUNT(*) FROM categories WHERE id = ?', [$id]) === 1;
    }

    public function buildingExists(int $id): bool
    {
        return $this->count(
            "SELECT COUNT(*) FROM residence_buildings WHERE id = ? AND status = 'active'",
            [$id]
        ) === 1;
    }

    private function decode(array $row): array
    {
        $row['requirement_flags'] = json_decode((string)$row['requirement_flags'], true) ?: [];
        return $row;
    }
}
