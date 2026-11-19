<?php

namespace Tests\Unit;

use App\Models\ResidenceNotice;
use App\Services\LocalDormRulesAssistant;
use PHPUnit\Framework\TestCase;

class LocalDormRulesAssistantTest extends TestCase
{
    public function test_answer_uses_only_retrieved_rules_and_never_echoes_other_row_fields(): void
    {
        $notices = $this->createMock(ResidenceNotice::class);
        $notices->expects(self::once())
            ->method('activeRulesForAssistant')
            ->with(17)
            ->willReturn([[
                'id' => 3,
                'title' => 'Giờ yên tĩnh',
                'body' => 'Giữ yên lặng sau 22 giờ.',
                'author_email' => 'private@example.test',
            ]]);
        $assistant = new LocalDormRulesAssistant($notices);

        $answer = $assistant->answer('Giờ yên tĩnh là khi nào?', 17);

        self::assertStringContainsString('Giữ yên lặng sau 22 giờ.', $answer['answer']);
        self::assertSame([['id' => 3, 'title' => 'Giờ yên tĩnh']], $answer['sources']);
        self::assertStringNotContainsString('private@example.test', $answer['answer']);
    }

    public function test_no_matching_rule_returns_handoff_without_claiming_an_answer(): void
    {
        $notices = $this->createMock(ResidenceNotice::class);
        $notices->method('activeRulesForAssistant')->willReturn([]);

        $answer = (new LocalDormRulesAssistant($notices))->answer('Không có nội dung liên quan?', null);

        self::assertSame([], $answer['sources']);
        self::assertStringContainsString('chưa tìm thấy', mb_strtolower($answer['answer']));
    }

    private function rules(): array
    {
        return [
            ['id' => 1, 'title' => 'Giờ mở cổng và giờ giới nghiêm', 'body' => 'Cổng mở từ 5:00 đến 23:00, sau đó phải quẹt thẻ.'],
            ['id' => 2, 'title' => 'Phòng cháy chữa cháy', 'body' => 'Cấm hút thuốc lá và đốt nến trong toàn bộ khu lưu trú.'],
            ['id' => 3, 'title' => 'Gửi xe', 'body' => 'Gửi một xe máy hoặc xe đạp tại bãi xe bằng thẻ cư trú.'],
        ];
    }

    public function test_question_without_diacritics_finds_the_rule(): void
    {
        $notices = $this->createMock(ResidenceNotice::class);
        $notices->method('activeRulesForAssistant')->willReturn($this->rules());

        $answer = (new LocalDormRulesAssistant($notices))->answer('gio gioi nghiem la may gio', null);

        self::assertSame(1, $answer['sources'][0]['id']);
    }

    public function test_dorm_words_dropped_by_marketplace_search_still_count(): void
    {
        // "thuốc" is a marketplace stopword (kích thước) but decisive for rules.
        $notices = $this->createMock(ResidenceNotice::class);
        $notices->method('activeRulesForAssistant')->willReturn($this->rules());

        $answer = (new LocalDormRulesAssistant($notices))->answer('Hút thuốc ở ban công được không?', null);

        self::assertSame([['id' => 2, 'title' => 'Phòng cháy chữa cháy']], $answer['sources']);
    }

    public function test_filler_words_alone_do_not_match_any_rule(): void
    {
        $notices = $this->createMock(ResidenceNotice::class);
        $notices->method('activeRulesForAssistant')->willReturn($this->rules());

        $answer = (new LocalDormRulesAssistant($notices))->answer('Cho em hỏi là được không ạ?', null);

        self::assertSame([], $answer['sources']);
    }
}
