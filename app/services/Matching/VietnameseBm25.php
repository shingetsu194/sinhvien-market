<?php

namespace App\Services\Matching;

/**
 * Vietnamese keyword relevance (BM25 + query coverage), a faithful port of the
 * evaluated prototype (frontend/lib/matching/engine.ts computeKeywordBm25Scores):
 * diacritics stripped, stopwords removed, unigrams + bigrams, k1=1.5, b=0.75,
 * score = 0.65·(1−e^(−bm25/4.5)) + 0.35·coverage ∈ [0,1].
 *
 * Used as the lexical half of the hybrid score: short Vietnamese queries such
 * as "bàn phím cơ" are poorly separated by text embeddings alone.
 * No intl extension needed (explicit character map).
 */
final class VietnameseBm25
{
    private const STOPWORDS = [
        'can', 'tim', 'mua', 'lai', 'cho', 'cua', 'va', 'hoac', 'voi', 'o', 'tai', 'trong', 'ngoai', 'tren',
        'duoi', 'de', 'di', 'hoc', 'con', 'mot', 'nhung', 'cac', 'nay', 'kia', 'rat', 'hoi', 'nhieu', 'it',
        'gia', 're', 'tot', 'on', 'nhu', 'hinh', 'anh', 'minh', 'nao', 'co', 'khong', 'lay', 'muon', 'uu',
        'tien', 'kich', 'thuoc', 'pass', 'nhanh', 'ktx', 'sinh', 'vien', 'phong', 'tro', 'truong',
    ];
    private const MAP = [
        'a' => 'àáảãạăằắẳẵặâầấẩẫậ', 'e' => 'èéẻẽẹêềếểễệ', 'i' => 'ìíỉĩị', 'o' => 'òóỏõọôồốổỗộơờớởỡợ',
        'u' => 'ùúủũụưừứửữự', 'y' => 'ỳýỷỹỵ', 'd' => 'đ',
    ];
    private static ?array $table = null;

    public static function stripDiacritics(string $text): string
    {
        if (self::$table === null) {
            self::$table = [];
            foreach (self::MAP as $ascii => $chars) {
                foreach (mb_str_split($chars) as $ch) {
                    self::$table[$ch] = $ascii;
                }
            }
        }
        // Decomposed input (Unikey "Unicode tổ hợp", macOS paste) carries tone/horn
        // marks as separate combining characters: drop them, then map precomposed letters.
        $text = (string)preg_replace('/\p{Mn}+/u', '', mb_strtolower($text));
        return strtr($text, self::$table);
    }

    /** @return list<string> unigrams then adjacent bigrams */
    public static function tokenize(string $text): array
    {
        preg_match_all('/[a-z0-9+]+/', self::stripDiacritics($text), $m);
        $stop = array_flip(self::STOPWORDS);
        $words = array_values(array_filter($m[0], static fn(string $w): bool => strlen($w) > 1 && !isset($stop[$w])));
        $bigrams = [];
        for ($i = 0; $i < count($words) - 1; $i++) {
            $bigrams[] = $words[$i] . '_' . $words[$i + 1];
        }
        return array_merge($words, $bigrams);
    }

    /**
     * @param array<int|string, string> $documents id => title + description (title counted twice by caller convention)
     * @return array<int|string, float> id => score in [0,1]
     */
    public static function scores(string $query, array $documents): array
    {
        $qTokens = self::tokenize($query);
        $out = array_fill_keys(array_keys($documents), 0.0);
        if ($qTokens === [] || $documents === []) {
            return $out;
        }
        $docs = [];
        $df = [];
        $total = 0;
        foreach ($documents as $id => $text) {
            $docs[$id] = self::tokenize($text);
            $total += count($docs[$id]);
            foreach (array_unique($docs[$id]) as $t) {
                $df[$t] = ($df[$t] ?? 0) + 1;
            }
        }
        $n = max(count($documents), 1);
        $avgDl = max($total / $n, 1);
        foreach ($docs as $id => $tokens) {
            $tf = array_count_values($tokens);
            $bm25 = 0.0;
            $matched = 0;
            foreach ($qTokens as $qt) {
                $f = $tf[$qt] ?? 0;
                if ($f === 0) {
                    continue;
                }
                $matched++;
                $idf = log(1 + ($n - ($df[$qt] ?? 0) + 0.5) / (($df[$qt] ?? 0) + 0.5));
                $bm25 += $idf * ($f * 2.5) / ($f + 1.5 * (0.25 + 0.75 * count($tokens) / $avgDl));
            }
            $out[$id] = round(0.65 * (1 - exp(-$bm25 / 4.5)) + 0.35 * ($matched / count($qTokens)), 4);
        }
        return $out;
    }
}
