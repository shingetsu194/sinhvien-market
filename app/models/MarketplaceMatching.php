<?php

namespace App\Models;

use Core\Model;

class MarketplaceMatching extends Model
{
    public function candidates(array $filters = [], int $limit = 500): array
    {
        $sql = 'SELECT p.id, p.title, p.description, p.image, p.type, p.price, p.`condition`,
                       p.category_id, c.name AS category_name, u.name AS seller_name,
                       u.is_student_verified AS seller_verified
                FROM products p
                JOIN categories c ON c.id = p.category_id
                JOIN users u ON u.id = p.user_id
                WHERE p.status = \'active\'';
        $params = [];
        if (($filters['categoryId'] ?? 0) > 0) {
            $sql .= ' AND p.category_id = ?';
            $params[] = (int)$filters['categoryId'];
        }
        if (($filters['priceMin'] ?? null) !== null) {
            $sql .= ' AND p.price >= ?';
            $params[] = (int)$filters['priceMin'];
        }
        if (($filters['priceMax'] ?? null) !== null) {
            $sql .= ' AND p.price <= ?';
            $params[] = (int)$filters['priceMax'];
        }
        if (($filters['condition'] ?? '') !== '') {
            $sql .= ' AND p.`condition` = ?';
            $params[] = $filters['condition'];
        }
        if (($filters['type'] ?? '') !== '') {
            $sql .= ' AND p.type = ?';
            $params[] = $filters['type'];
        }
        $sql .= ' ORDER BY p.created_at DESC, p.id DESC LIMIT ?';
        $params[] = max(1, min($limit, 1000));
        return $this->query($sql, $params);
    }

    /**
     * Active listings for smart search, with the seller's CURRENT dormitory
     * building derived from an active bed allocation (residence context).
     * Sellers without an allocation get NULL (= ngoài KTX).
     */
    public function smartCandidates(?int $excludeUserId = null, int $limit = 500): array
    {
        $sql = "SELECT p.id, p.user_id, p.title, p.description, p.image, p.type, p.price, p.`condition`,
                       p.category_id, c.name AS category_name, u.name AS seller_name,
                       u.is_student_verified AS seller_verified,
                       sb.building_id AS seller_building_id, sb.building_name AS seller_building_name,
                       (pi.product_id IS NOT NULL) AS has_image
                FROM products p
                JOIN categories c ON c.id = p.category_id
                JOIN users u ON u.id = p.user_id
                LEFT JOIN product_images pi ON pi.product_id = p.id
                LEFT JOIN (
                    SELECT a.user_id, MIN(b.id) AS building_id, MIN(b.name) AS building_name
                    FROM residence_bed_allocations a
                    JOIN residence_beds bd ON bd.id = a.bed_id
                    JOIN residence_rooms r ON r.id = bd.room_id
                    JOIN residence_floors f ON f.id = r.floor_id
                    JOIN residence_buildings b ON b.id = f.building_id
                    WHERE a.status = 'active' AND CURDATE() BETWEEN a.start_date AND a.end_date
                    GROUP BY a.user_id
                ) sb ON sb.user_id = p.user_id
                WHERE p.status = 'active'";
        $params = [];
        if ($excludeUserId !== null) {
            $sql .= ' AND p.user_id <> ?';
            $params[] = $excludeUserId;
        }
        $sql .= ' ORDER BY p.created_at DESC, p.id DESC LIMIT ?';
        $params[] = max(1, min($limit, 1000));
        return $this->query($sql, $params);
    }

    /** @return array{data:string, mime:string}|null */
    public function productImage(int $productId): ?array
    {
        $row = $this->queryOne('SELECT data, mime FROM product_images WHERE product_id = ?', [$productId]);
        return $row === null ? null : ['data' => (string)$row['data'], 'mime' => (string)$row['mime']];
    }

    public function savedEmbedding(int $productId, string $modelKey, string $contentHash): ?array
    {
        $row = $this->queryOne(
            'SELECT embedding FROM marketplace_product_embeddings
             WHERE product_id = ? AND model_key = ? AND content_hash = ?',
            [$productId, $modelKey, $contentHash]
        );
        if ($row === null) {
            return null;
        }
        $vector = json_decode((string)$row['embedding'], true);
        return is_array($vector) ? $vector : null;
    }

    public function saveEmbedding(int $productId, string $modelKey, array $embedding, string $contentHash): void
    {
        $this->execute(
            'INSERT INTO marketplace_product_embeddings (product_id, model_key, embedding, content_hash)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE embedding = VALUES(embedding), content_hash = VALUES(content_hash)',
            [$productId, $modelKey, json_encode($embedding, JSON_THROW_ON_ERROR), $contentHash]
        );
    }

    public function saveEvaluation(array $evaluation, int $actorId): int
    {
        return $this->insert(
            'INSERT INTO marketplace_matching_evaluations
                (query_text, relevant_product_ids, result_product_ids, precision_at_5, recall_at_5,
                 mrr_at_5, ndcg_at_5, model_key, evaluated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $evaluation['queryText'],
                json_encode($evaluation['relevantProductIds'], JSON_THROW_ON_ERROR),
                json_encode($evaluation['resultProductIds'], JSON_THROW_ON_ERROR),
                $evaluation['metrics']['precisionAt5'],
                $evaluation['metrics']['recallAt5'],
                $evaluation['metrics']['mrrAt5'],
                $evaluation['metrics']['ndcgAt5'],
                $evaluation['modelKey'],
                $actorId,
            ]
        );
    }

    public function productIdsExist(array $productIds): bool
    {
        if ($productIds === []) {
            return false;
        }
        $marks = implode(',', array_fill(0, count($productIds), '?'));
        return $this->count(
            "SELECT COUNT(*) FROM products WHERE id IN ({$marks})",
            $productIds
        ) === count(array_unique($productIds));
    }

    public function evaluations(int $limit = 100): array
    {
        $rows = $this->query(
            'SELECT e.*, u.name AS evaluator_name FROM marketplace_matching_evaluations e
             JOIN users u ON u.id = e.evaluated_by ORDER BY e.id DESC LIMIT ?',
            [max(1, min(200, $limit))]
        );
        foreach ($rows as &$row) {
            $row['relevant_product_ids'] = json_decode((string)$row['relevant_product_ids'], true) ?: [];
            $row['result_product_ids'] = json_decode((string)$row['result_product_ids'], true) ?: [];
        }
        unset($row);
        return $rows;
    }
}
