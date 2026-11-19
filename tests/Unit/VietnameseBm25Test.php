<?php

namespace Tests\Unit;

use App\Services\Matching\VietnameseBm25;
use PHPUnit\Framework\TestCase;

class VietnameseBm25Test extends TestCase
{
    public function test_strips_vietnamese_diacritics_including_d(): void
    {
        self::assertSame('ban phim co dam da', VietnameseBm25::stripDiacritics('Bàn Phím Cơ ĐẬM ĐÀ'));
    }

    public function test_decomposed_unicode_input_is_normalised_like_precomposed(): void
    {
        // "Nồi cơm điện" typed as base letters + combining marks (NFD):
        // ô = o + U+0302, ̀ = U+0300, ơ = o + U+031B, ệ = e + U+0302 + U+0323; đ stays precomposed.
        $nfd = "No\u{0302}\u{0300}i co\u{031B}m \u{0111}ie\u{0302}\u{0323}n";
        self::assertSame('noi com dien', VietnameseBm25::stripDiacritics($nfd));
        $scores = VietnameseBm25::scores($nfd, [1 => 'Nồi cơm điện mini 0.8L', 2 => 'Ấm đun siêu tốc']);
        self::assertGreaterThan(0.5, $scores[1]);
    }

    public function test_tokenizer_drops_stopwords_and_adds_bigrams(): void
    {
        self::assertSame(['ban', 'phim', 'ban_phim'], VietnameseBm25::tokenize('Cần tìm mua bàn phím cho KTX'));
    }

    public function test_short_query_ranks_the_exact_listing_first(): void
    {
        // Regression: Gemini text embeddings alone ranked a laptop backpack above the keyboard.
        $scores = VietnameseBm25::scores('bàn phím cơ', [
            1 => 'Balo chống nước đựng laptop 15.6 inch Balo chống nước đựng laptop 15.6 inch đi học',
            2 => 'Bàn phím cơ Keychron K6 Red Switch Bàn phím cơ Keychron K6 Red Switch gõ êm',
            3 => 'Bàn học gấp gọn mini Bàn học gấp gọn mini cho phòng',
        ]);
        arsort($scores);
        self::assertSame(2, array_key_first($scores));
        self::assertSame(0.0, $scores[1]);
    }

    public function test_unaccented_query_matches_accented_listing(): void
    {
        $scores = VietnameseBm25::scores('noi com dien mini', [1 => 'Nồi cơm điện mini 0.8L', 2 => 'Ấm đun siêu tốc']);
        self::assertGreaterThan(0.5, $scores[1]);
        self::assertSame(0.0, $scores[2]);
    }
}
