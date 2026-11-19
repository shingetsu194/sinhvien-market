<?php

namespace App\Services;

use App\Models\ResidenceNotice;
use App\Services\Matching\VietnameseBm25;

/**
 * Retrieval-only assistant: answers strictly from published dorm rules.
 *
 * Rules are ranked with the same Vietnamese BM25 used by marketplace search
 * (diacritics-insensitive, stopwords removed, unigrams + bigrams), so
 * "gio gioi nghiem" finds "Giờ giới nghiêm" and filler words such as
 * "khi nào" / "được không" no longer match every rule. Uses its own stopword list.
 */
class LocalDormRulesAssistant
{
    /** BM25+coverage score below which a rule is not considered an answer. */
    private const MIN_SCORE = 0.40;
    /** Secondary rules are shown only when nearly as relevant as the best one. */
    private const RELATIVE_CUTOFF = 0.85;
    private const MAX_SOURCES = 2;
    /**
     * Stopwords for rule lookup (diacritics-free). Separate from the marketplace
     * list, which drops words such as "tiền" (ưu tiên) and "thuốc" (kích thước)
     * that matter here. Words that collide with topic words once accents are gone
     * (máy, thẻ, tối, báo, bàn giao) are deliberately kept.
     */
    private const STOPWORDS = [
        'va', 'hoac', 'voi', 'cua', 'cho', 'trong', 'tren', 'duoi', 'cac', 'nhung', 'mot', 'nay', 'kia', 'rat',
        'co', 'khong', 'tai', 'de', 'la', 'khi', 'nao', 'nhieu', 'sao', 'duoc', 'gi', 'ai', 'oi', 'nhe', 'vay',
        'thi', 'em', 'hoi', 'xin', 'phai', 'bi', 'neu', 'nhu', 'minh', 'ban', 'muon', 'can', 'dau', 'ktx',
        'sinh', 'vien', 'chao', 'hoc', 'truong',
    ];

    public function __construct(private readonly ResidenceNotice $notices = new ResidenceNotice())
    {
    }

    /**
     * @return array{answer:string,sources:list<array{id:int,title:string}>,modelKey:string}
     */
    public function answer(string $question, ?int $userId): array
    {
        $rules = [];
        $documents = [];
        foreach ($this->notices->activeRulesForAssistant($userId) as $rule) {
            $id = (int)$rule['id'];
            $rules[$id] = $rule;
            // Title counted twice, as in marketplace search.
            $documents[$id] = $rule['title'] . ' ' . $rule['title'] . ' ' . strip_tags((string)$rule['body']);
        }

        $scores = VietnameseBm25::scores($question, $documents, self::STOPWORDS);
        arsort($scores);
        $best = (float)(reset($scores) ?: 0.0);

        $sources = [];
        $answers = [];
        if ($best >= self::MIN_SCORE) {
            foreach ($scores as $id => $score) {
                if ($score < self::MIN_SCORE || $score < $best * self::RELATIVE_CUTOFF || count($sources) >= self::MAX_SOURCES) {
                    break;
                }
                $rule = $rules[$id];
                $sources[] = ['id' => (int)$rule['id'], 'title' => (string)$rule['title']];
                $answers[] = '• ' . $rule['title'] . ': ' . mb_substr(trim(strip_tags((string)$rule['body'])), 0, 700);
            }
        }

        return [
            'answer' => $answers
                ? implode("\n\n", $answers)
                : 'Tôi chưa tìm thấy quy định phù hợp trong các nội quy đang được công bố. Vui lòng liên hệ Ban quản lý KTX để được xác nhận.',
            'sources' => $sources,
            'modelKey' => 'local-dorm-rules-bm25-vi-v2',
        ];
    }
}
