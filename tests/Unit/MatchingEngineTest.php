<?php

namespace Tests\Unit;

use App\Services\Matching\MatchingEngine;
use PHPUnit\Framework\TestCase;

class MatchingEngineTest extends TestCase
{
    private static function product(int $id, array $overrides = []): array
    {
        return array_merge([
            'id' => $id, 'title' => "SP $id", 'category_id' => 5, 'category_name' => 'Đồ gia dụng KTX',
            'type' => 'sale', 'price' => 150000, 'condition' => 'like_new',
            'seller_building_id' => 1, 'seller_building_name' => 'Tòa A',
            'semantic' => 0.8, 'semanticVia' => 'text',
        ], $overrides);
    }

    private static function ids(array $ranked): array
    {
        return array_map(static fn(array $r): int => $r['id'], $ranked['results']);
    }

    public function test_semantically_irrelevant_products_are_never_returned(): void
    {
        $ranked = MatchingEngine::rank([], [
            self::product(1, ['semantic' => 0.9]),
            self::product(2, ['semantic' => 0.39]), // below threshold: must not show up as "84% match"
        ]);
        self::assertSame([1], self::ids($ranked));
        self::assertSame(1, $ranked['relevantCount']);
    }

    public function test_constraints_without_flags_are_hard(): void
    {
        $ranked = MatchingEngine::rank(['budgetMax' => 100000], [
            self::product(1, ['price' => 90000]),
            self::product(2, ['price' => 120000]),
        ]);
        self::assertSame([1], self::ids($ranked));
        self::assertSame(['budget' => 1], $ranked['hardBlockers']);
    }

    public function test_soft_budget_keeps_over_budget_item_but_ranks_it_lower_with_reason(): void
    {
        $ranked = MatchingEngine::rank(['budgetMax' => 100000, 'flags' => ['budget' => 'soft']], [
            self::product(1, ['price' => 130000, 'semantic' => 0.82]),
            self::product(2, ['price' => 90000, 'semantic' => 0.80]),
        ]);
        self::assertSame([2, 1], self::ids($ranked));
        self::assertFalse($ranked['results'][1]['fullyMatches']);
        self::assertStringContainsString('Vượt ngân sách', $ranked['results'][1]['unmatchedConditions'][0]);
    }

    public function test_exchange_listings_require_explicit_acceptance(): void
    {
        $candidates = [self::product(1, ['type' => 'exchange', 'price' => null])];
        self::assertSame([], self::ids(MatchingEngine::rank([], $candidates)));
        self::assertSame([1], self::ids(MatchingEngine::rank(['allowExchange' => true], $candidates)));
    }

    public function test_hard_location_uses_the_sellers_dormitory_building(): void
    {
        $ranked = MatchingEngine::rank(['buildingId' => 1], [
            self::product(1, ['seller_building_id' => 1]),
            self::product(2, ['seller_building_id' => 2, 'seller_building_name' => 'Tòa B']),
            self::product(3, ['seller_building_id' => null, 'seller_building_name' => null]),
        ]);
        self::assertSame([1], self::ids($ranked));
        self::assertContains('Người bán ở cùng Tòa A', $ranked['results'][0]['matchedConditions']);
    }

    public function test_counterfactual_relaxes_only_soft_constraints_and_is_verified(): void
    {
        $ranked = MatchingEngine::rank(
            ['budgetMax' => 100000, 'minCondition' => 'new', 'flags' => ['budget' => 'soft']],
            [self::product(1, ['price' => 140000, 'condition' => 'new'])]
        );
        // Over budget (soft) → listed but not a full match → a budget suggestion that unlocks #1.
        self::assertSame([1], self::ids($ranked));
        self::assertNotEmpty($ranked['counterfactuals']);
        $first = $ranked['counterfactuals'][0];
        self::assertSame(['budgetMax' => 150000], $first['patch']);
        self::assertSame([1], $first['unlockedProductIds']);
        foreach ($ranked['counterfactuals'] as $cf) {
            self::assertArrayNotHasKey('minCondition', $cf['patch'], 'hard condition must never be relaxed');
        }
    }

    public function test_hard_blocker_produces_no_suggestion_that_violates_it(): void
    {
        $ranked = MatchingEngine::rank(
            ['budgetMax' => 100000],
            [self::product(1, ['price' => 140000])]
        );
        self::assertSame([], $ranked['results']);
        self::assertSame([], $ranked['counterfactuals']);
        self::assertSame(['budget' => 1], $ranked['hardBlockers']);
    }

    public function test_two_soft_constraints_are_relaxed_together_only_when_one_is_not_enough(): void
    {
        $ranked = MatchingEngine::rank(
            ['budgetMax' => 100000, 'buildingId' => 1, 'flags' => ['budget' => 'soft', 'location' => 'soft']],
            [self::product(1, ['price' => 140000, 'seller_building_id' => 2, 'seller_building_name' => 'Tòa B'])]
        );
        self::assertCount(1, $ranked['counterfactuals']);
        self::assertSame(2, $ranked['counterfactuals'][0]['changes']);
        self::assertSame(['budgetMax' => 150000, 'buildingId' => null], $ranked['counterfactuals'][0]['patch']);
    }

    public function test_full_match_means_no_counterfactual(): void
    {
        $ranked = MatchingEngine::rank(['budgetMax' => 200000], [self::product(1)]);
        self::assertTrue($ranked['results'][0]['fullyMatches']);
        self::assertSame([], $ranked['counterfactuals']);
    }
}
