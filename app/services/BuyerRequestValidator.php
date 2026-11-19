<?php

namespace App\Services;

/**
 * Validates and normalises a buyer REQUEST (nhu cầu tìm mua) from API input.
 * Pure: no database access, so it is unit-testable. Existence of the
 * category/building ids is checked by the controller.
 *
 * Safe-default rule (báo cáo thiết kế §4.4): every constraint the buyer sets
 * is "hard" unless explicitly flagged "soft"; flags for unset constraints are
 * dropped so they can never relax anything.
 */
final class BuyerRequestValidator
{
    public const CONDITIONS = ['new', 'like_new', 'used', 'worn'];
    public const FLAG_KEYS = ['category', 'budget', 'condition', 'location'];
    public const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
    private const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    /**
     * @return array{description:string, categoryId:?int, budgetMax:?int, minCondition:?string,
     *   buildingId:?int, allowExchange:bool, flags:array<string,string>, expiresInDays:int,
     *   imageMime:?string, imageData:?string}
     * @throws \InvalidArgumentException with a Vietnamese message for the user
     */
    public static function validate(array $data, int $minDescription = 5): array
    {
        $description = is_scalar($data['description'] ?? null) ? trim((string)$data['description']) : '';
        $length = mb_strlen($description);
        if ($length < $minDescription || $length > 1000) {
            throw new \InvalidArgumentException("Mô tả nhu cầu phải từ {$minDescription} đến 1000 ký tự.");
        }

        $categoryId = self::optionalId($data['categoryId'] ?? null, 'Danh mục không hợp lệ.');
        $buildingId = self::optionalId($data['buildingId'] ?? null, 'Tòa KTX không hợp lệ.');

        $budgetMax = null;
        if (($data['budgetMax'] ?? null) !== null && $data['budgetMax'] !== '') {
            $budgetMax = filter_var($data['budgetMax'], FILTER_VALIDATE_INT);
            if ($budgetMax === false || $budgetMax < 1000 || $budgetMax > 1000000000) {
                throw new \InvalidArgumentException('Ngân sách phải từ 1.000đ đến 1.000.000.000đ.');
            }
        }

        $minCondition = null;
        if (($data['minCondition'] ?? null) !== null && $data['minCondition'] !== '') {
            $minCondition = (string)$data['minCondition'];
            if (!in_array($minCondition, self::CONDITIONS, true)) {
                throw new \InvalidArgumentException('Tình trạng tối thiểu không hợp lệ.');
            }
        }

        $allowExchange = filter_var($data['allowExchange'] ?? false, FILTER_VALIDATE_BOOL);

        $expiresInDays = 30;
        if (($data['expiresInDays'] ?? null) !== null && $data['expiresInDays'] !== '') {
            $expiresInDays = filter_var($data['expiresInDays'], FILTER_VALIDATE_INT);
            if ($expiresInDays === false || $expiresInDays < 1 || $expiresInDays > 90) {
                throw new \InvalidArgumentException('Thời hạn nhu cầu phải từ 1 đến 90 ngày.');
            }
        }

        $set = [
            'category' => $categoryId !== null,
            'budget' => $budgetMax !== null,
            'condition' => $minCondition !== null,
            'location' => $buildingId !== null,
        ];
        $rawFlags = is_array($data['flags'] ?? null) ? $data['flags'] : [];
        $flags = [];
        foreach (self::FLAG_KEYS as $key) {
            if (!$set[$key]) {
                continue;
            }
            $value = $rawFlags[$key] ?? 'hard';
            if (!in_array($value, ['hard', 'soft'], true)) {
                throw new \InvalidArgumentException('Mức ưu tiên điều kiện chỉ nhận "hard" hoặc "soft".');
            }
            $flags[$key] = $value;
        }

        [$imageMime, $imageData] = self::image($data['imageDataUrl'] ?? null);

        return [
            'description' => $description,
            'categoryId' => $categoryId,
            'budgetMax' => $budgetMax,
            'minCondition' => $minCondition,
            'buildingId' => $buildingId,
            'allowExchange' => $allowExchange,
            'flags' => $flags,
            'expiresInDays' => $expiresInDays,
            'imageMime' => $imageMime,
            'imageData' => $imageData,
        ];
    }

    private static function optionalId(mixed $value, string $message): ?int
    {
        if ($value === null || $value === '' || $value === 0 || $value === '0') {
            return null;
        }
        $id = filter_var($value, FILTER_VALIDATE_INT);
        if ($id === false || $id < 1) {
            throw new \InvalidArgumentException($message);
        }
        return $id;
    }

    /** @return array{0:?string,1:?string} [mime, binary] from a base64 data URL */
    private static function image(mixed $dataUrl): array
    {
        if ($dataUrl === null || $dataUrl === '') {
            return [null, null];
        }
        if (!is_string($dataUrl)
            || !preg_match('#^data:(image/[a-z+.-]+);base64,([A-Za-z0-9+/=\r\n]+)$#', $dataUrl, $m)) {
            throw new \InvalidArgumentException('Ảnh tham khảo không hợp lệ.');
        }
        // Base64 inflates by 4/3: reject oversize input before decoding it.
        if (strlen($m[2]) > (int)ceil(self::MAX_IMAGE_BYTES * 4 / 3) + 8) {
            throw new \InvalidArgumentException('Ảnh tham khảo tối đa 2MB.');
        }
        $binary = base64_decode($m[2], true);
        if ($binary === false || $binary === '' || strlen($binary) > self::MAX_IMAGE_BYTES) {
            throw new \InvalidArgumentException('Ảnh tham khảo tối đa 2MB.');
        }
        $info = @getimagesizefromstring($binary);
        $mime = is_array($info) ? (string)($info['mime'] ?? '') : '';
        if (!in_array($mime, self::IMAGE_MIMES, true)) {
            throw new \InvalidArgumentException('Ảnh tham khảo phải là JPG, PNG hoặc WEBP.');
        }
        return [$mime, $binary];
    }
}
