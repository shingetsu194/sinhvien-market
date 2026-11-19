<?php

namespace Tests\Unit;

use App\Services\BuyerRequestValidator;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class BuyerRequestValidatorTest extends TestCase
{
    /** A valid 1x1 PNG (no GD needed), optionally padded to grow its size. */
    private static function png(int $paddingBytes = 0): string
    {
        $bin = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        );
        return 'data:image/png;base64,' . base64_encode($bin . str_repeat("\0", $paddingBytes));
    }

    public function test_minimal_request_has_no_constraints_and_defaults(): void
    {
        $r = BuyerRequestValidator::validate(['description' => '  Cần nồi cơm mini  ']);
        self::assertSame('Cần nồi cơm mini', $r['description']);
        self::assertNull($r['categoryId']);
        self::assertNull($r['budgetMax']);
        self::assertSame([], $r['flags']);
        self::assertFalse($r['allowExchange']);
        self::assertSame(30, $r['expiresInDays']);
        self::assertNull($r['imageData']);
    }

    public function test_set_constraints_default_to_hard_and_unset_flags_are_dropped(): void
    {
        $r = BuyerRequestValidator::validate([
            'description' => 'Bàn phím cơ cũ',
            'categoryId' => '2',
            'budgetMax' => 500000,
            'minCondition' => 'like_new',
            'flags' => ['budget' => 'soft', 'location' => 'soft'],
        ]);
        // category/condition not flagged -> hard; budget explicitly soft;
        // location was never set, so its "soft" flag cannot relax anything.
        self::assertSame(['category' => 'hard', 'budget' => 'soft', 'condition' => 'hard'], $r['flags']);
        self::assertSame(2, $r['categoryId']);
    }

    /** @return array<string, array{array<string,mixed>}> */
    public static function invalidInputs(): array
    {
        return [
            'description too short' => [['description' => 'abc']],
            'description too long' => [['description' => str_repeat('a', 1001)]],
            'negative category' => [['description' => 'Cần mua sách', 'categoryId' => -1]],
            'budget too small' => [['description' => 'Cần mua sách', 'budgetMax' => 10]],
            'budget not a number' => [['description' => 'Cần mua sách', 'budgetMax' => 'rẻ']],
            'unknown condition' => [['description' => 'Cần mua sách', 'minCondition' => 'broken']],
            'bad flag value' => [['description' => 'Cần mua sách', 'budgetMax' => 50000, 'flags' => ['budget' => 'maybe']]],
            'expires too long' => [['description' => 'Cần mua sách', 'expiresInDays' => 365]],
            'image not data url' => [['description' => 'Cần mua sách', 'imageDataUrl' => 'http://x/y.png']],
            'image not really an image' => [['description' => 'Cần mua sách',
                'imageDataUrl' => 'data:image/png;base64,' . base64_encode('<?php echo 1; ?>')]],
        ];
    }

    #[DataProvider('invalidInputs')]
    public function test_rejects_invalid_input(array $input): void
    {
        $this->expectException(\InvalidArgumentException::class);
        BuyerRequestValidator::validate($input);
    }

    public function test_accepts_real_image_and_detects_mime_from_content(): void
    {
        // Declared as jpeg, content is png: the stored mime comes from the bytes.
        $url = str_replace('data:image/png', 'data:image/jpeg', self::png());
        $r = BuyerRequestValidator::validate(['description' => 'Món như ảnh', 'imageDataUrl' => $url]);
        self::assertSame('image/png', $r['imageMime']);
        self::assertNotEmpty($r['imageData']);
    }

    public function test_rejects_image_over_two_megabytes(): void
    {
        $this->expectExceptionMessage('2MB');
        BuyerRequestValidator::validate([
            'description' => 'Món như ảnh',
            'imageDataUrl' => self::png(BuyerRequestValidator::MAX_IMAGE_BYTES),
        ]);
    }
}
