<?php

/**
 * W8 benchmark: evaluates the PRODUCTION matching pipeline (SmartSearchService
 * scoring + MatchingEngine ranking with hard constraints) on the REQUEST–OFFER
 * evaluation set in database/demo/marketplace (30 requests, 41 offers).
 *
 *   php scripts/eval/run-benchmark.php            # uses cached vectors when present
 *   php scripts/eval/run-benchmark.php --refresh  # re-embeds everything (needs GEMINI_API_KEY)
 *
 * Method (fixes the prototype's weaknesses):
 * - Fixed, stratified dev/test split (sorted by scenario then id, alternating).
 *   The only tuned parameter, the semantic threshold, is chosen on DEV; TEST is
 *   reported with that value (and with the prototype default for transparency).
 * - Ablation over the two design choices: BM25 in the text channel, image channels.
 * - Ground truth = human semantic label >= 1 AND no hard-constraint violation
 *   according to MatchingEngine itself (the deployed rules).
 * - Latency: cold (query embedding call) and warm (ranking with cached vectors).
 *
 * Writes scripts/eval/results/benchmark_w8.json and docs/BAO_CAO_BENCHMARK_W8.md.
 */

declare(strict_types=1);

define('ROOT', dirname(__DIR__, 2));
define('APP_PATH', ROOT . '/app');
spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\Services\\';
    if (str_starts_with($class, $prefix)) {
        $file = APP_PATH . '/services/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) {
            require $file;
        }
    }
});
// .env (same loader rules as index.php) so GEMINI_API_KEY works without exporting it.
if (is_file(ROOT . '/.env')) {
    foreach (file(ROOT . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = array_map('trim', explode('=', $line, 2));
        if (getenv($k) === false) {
            putenv($k . '=' . trim($v, "\"'"));
        }
    }
}

use App\Services\LocalMarketplaceEmbeddingService;
use App\Services\Matching\GeminiEmbeddingService;
use App\Services\Matching\MatchingEngine;
use App\Services\Matching\SmartSearchService;

const K = 5;
const BUILDINGS = ['A' => [1, 'Tòa A'], 'B' => [2, 'Tòa B']];
const CATEGORY_NAMES = [1 => 'Giáo trình & Sách', 2 => 'Điện tử & Máy tính', 3 => 'Đồ dùng học tập',
    4 => 'Quần áo & Phụ kiện', 5 => 'Đồ gia dụng KTX', 6 => 'Thể thao & Giải trí', 7 => 'Khác'];

$dataDir = ROOT . '/database/demo/marketplace';
$offers = json_decode(file_get_contents("$dataDir/offers.json"), true, 512, JSON_THROW_ON_ERROR);
$requests = json_decode(file_get_contents("$dataDir/requests.json"), true, 512, JSON_THROW_ON_ERROR);
$labels = json_decode(file_get_contents("$dataDir/semantic_labels.json"), true, 512, JSON_THROW_ON_ERROR);
$refresh = in_array('--refresh', $argv, true);

// ---- Candidates in the exact shape SmartSearchService/MatchingEngine use ----
$candidates = [];
foreach ($offers as $i => $o) {
    [$buildingId, $buildingName] = BUILDINGS[$o['seller']] ?? [null, null];
    $candidates[] = [
        'id' => $i + 1, 'ref' => $o['ref'], 'title' => $o['title'], 'description' => $o['description'],
        'category_id' => $o['categoryId'], 'category_name' => CATEGORY_NAMES[$o['categoryId']],
        'type' => $o['type'], 'price' => $o['price'], 'condition' => $o['condition'],
        'seller_building_id' => $buildingId, 'seller_building_name' => $buildingName ?? 'Ngoài KTX',
        'image' => $o['image'],
    ];
}
$idByRef = array_column($candidates, 'id', 'ref');
$refById = array_column($candidates, 'ref', 'id');

function requestInput(array $r): array
{
    return [
        'description' => $r['description'], 'categoryId' => $r['categoryId'], 'budgetMax' => $r['budgetMax'],
        'minCondition' => $r['minCondition'], 'buildingId' => $r['building'] ? BUILDINGS[$r['building']][0] : null,
        'allowExchange' => $r['allowExchange'], 'flags' => $r['flags'],
    ];
}

// Ground truth with the deployed rules.
$truth = [];
foreach ($requests as $r) {
    $truth[$r['id']] = [];
    foreach ($labels[$r['id']] ?? [] as $ref => $grade) {
        $c = $candidates[$idByRef[$ref] - 1];
        if ($grade > 0 && MatchingEngine::hardViolations(requestInput($r), $c) === []) {
            $truth[$r['id']][$c['id']] = (int)$grade;
        }
    }
}

// Fixed stratified split.
$sorted = $requests;
usort($sorted, static fn(array $a, array $b): int => [$a['scenario'], $a['id']] <=> [$b['scenario'], $b['id']]);
$split = [];
foreach ($sorted as $i => $r) {
    $split[$r['id']] = $i % 2 === 0 ? 'dev' : 'test';
}

// ---- Vectors (cached so results are reproducible offline) ----
$cacheFile = __DIR__ . '/cache/gemini-embedding-2-d768.json';
$cache = (!$refresh && is_file($cacheFile)) ? json_decode(file_get_contents($cacheFile), true) : [];
$gemini = new GeminiEmbeddingService();
$timing = ['queryText' => [], 'queryImage' => [], 'offerText' => [], 'offerImage' => []];
$vector = static function (string $key, callable $make, string $timingKey) use (&$cache, &$timing, $gemini): ?array {
    if (isset($cache[$key])) {
        return $cache[$key];
    }
    if (!$gemini->available()) {
        fwrite(STDERR, "Missing cached vector $key and GEMINI_API_KEY is not set.\n");
        exit(2);
    }
    $t = microtime(true);
    $v = $make();
    $timing[$timingKey][] = (microtime(true) - $t) * 1000;
    if ($v === null) {
        fwrite(STDERR, "Embedding failed for $key: " . ($gemini->lastError() ?? '?') . "\n");
        exit(1);
    }
    return $cache[$key] = $v;
};
foreach ($candidates as &$c) {
    // Same document text as SmartSearchService::attachVectors.
    $text = $c['title'] . "\n" . $c['description'] . "\nDanh mục: " . $c['category_name'];
    $c['textVec'] = $vector('offer:' . $c['ref'] . ':text', static fn() => $gemini->embedText($text, 'RETRIEVAL_DOCUMENT'), 'offerText');
    $c['imageVec'] = null;
    $c['has_image'] = $c['image'] ? 1 : 0;
    if ($c['image']) {
        $bytes = file_get_contents("$dataDir/images/{$c['image']}");
        $c['imageVec'] = $vector('offer:' . $c['ref'] . ':image', static fn() => $gemini->embedImage($bytes, 'image/jpeg'), 'offerImage');
    }
}
unset($c);
$queries = [];
foreach ($requests as $r) {
    $queries[$r['id']] = [
        'text' => $vector('request:' . $r['id'] . ':text', static fn() => $gemini->embedText($r['description'], 'RETRIEVAL_QUERY'), 'queryText'),
        'image' => $r['image'] ? $vector('request:' . $r['id'] . ':image',
            static fn() => $gemini->embedImage(file_get_contents("$dataDir/images/{$r['image']}"), 'image/jpeg'), 'queryImage') : null,
    ];
}
if (!is_dir(dirname($cacheFile))) {
    mkdir(dirname($cacheFile), 0777, true);
}
file_put_contents($cacheFile, json_encode($cache));

// ---- Variants ----
$legacy = new LocalMarketplaceEmbeddingService();
$legacyDocs = [];
foreach ($candidates as $c) {
    $legacyDocs[$c['id']] = $legacy->embed($c['title'] . ' ' . $c['description'] . ' ' . $c['category_name']);
}
$variants = [
    'B0' => ['Baseline cũ: feature hashing + cosine', 'legacy'],
    'B1' => ['BM25 tiếng Việt (không AI)', 'bm25'],
    'M1' => ['Gemini văn bản, không BM25, không ảnh', 'gemini', false, false],
    'M2' => ['Gemini văn bản + BM25, không ảnh', 'gemini', true, false],
    'M3' => ['Gemini văn bản + ảnh, không BM25', 'gemini', false, true],
    'M4' => ['Gemini + BM25 + ảnh (đang chạy thật)', 'gemini', true, true],
];

/** @return array<int,float> id => semantic score for one request under one variant */
function semantic(array $variant, array $r, array $q, array $candidates, LocalMarketplaceEmbeddingService $legacy, array $legacyDocs): array
{
    $input = ['description' => $r['description']];
    if ($variant[1] === 'legacy') {
        $qv = $legacy->embed($r['description']);
        $out = [];
        foreach ($candidates as $c) {
            $out[$c['id']] = $legacy->cosine($qv, $legacyDocs[$c['id']]);
        }
        return $out;
    }
    if ($variant[1] === 'bm25') {
        return SmartSearchService::keywordScores($input, $candidates);
    }
    [, , $useBm25, $useImage] = $variant;
    $cands = $useImage ? $candidates : array_map(static fn(array $c): array => ['imageVec' => null] + $c, $candidates);
    $keyword = $useBm25 ? SmartSearchService::keywordScores($input, $candidates) : null;
    $scored = SmartSearchService::semanticScores($cands, $q['text'], $useImage ? $q['image'] : null, $keyword);
    $out = [];
    foreach ($scored as $c) {
        $out[$c['id']] = (float)$c['semantic'];
    }
    return $out;
}

function metrics(array $ranked, array $gt): array
{
    $top = array_slice($ranked, 0, K);
    $hits = count(array_filter($top, static fn(int $id): bool => isset($gt[$id])));
    $rr = 0.0;
    foreach ($top as $i => $id) {
        if (isset($gt[$id])) {
            $rr = 1 / ($i + 1);
            break;
        }
    }
    $dcg = 0.0;
    foreach ($top as $i => $id) {
        $dcg += ((2 ** ($gt[$id] ?? 0)) - 1) / log($i + 2, 2);
    }
    $ideal = array_values($gt);
    rsort($ideal);
    $idcg = 0.0;
    foreach (array_slice($ideal, 0, K) as $i => $g) {
        $idcg += ((2 ** $g) - 1) / log($i + 2, 2);
    }
    // "shown" = precision of what the user actually sees (most requests have one right answer,
    // so P@5 is capped at 0.2 and hides junk results; this one does not).
    return ['p' => $hits / K, 'shown' => $top ? $hits / count($top) : 0.0, 'r' => $hits / count($gt),
        'mrr' => $rr, 'ndcg' => $idcg > 0 ? $dcg / $idcg : 0.0];
}

/** Evaluate one variant on a subset at a threshold. */
function evaluate(array $scores, array $requests, array $truth, array $candidates, array $subset, float $threshold): array
{
    $sum = ['p' => 0, 'shown' => 0, 'r' => 0, 'mrr' => 0, 'ndcg' => 0];
    $overall = 0.0;
    $n = 0;
    $emptyOk = 0;
    $emptyN = 0;
    $perRequest = [];
    foreach ($requests as $r) {
        if (!in_array($r['id'], $subset, true)) {
            continue;
        }
        $cands = array_map(static fn(array $c): array => ['semantic' => $scores[$r['id']][$c['id']], 'semanticVia' => 'text'] + $c, $candidates);
        $ranked = array_map(static fn(array $x): int => (int)$x['id'], MatchingEngine::rank(requestInput($r), $cands, $threshold, 20)['results']);
        $gt = $truth[$r['id']];
        if ($gt === []) {
            // No admissible offer exists: success = the system shows nothing.
            $emptyN++;
            $emptyOk += $ranked === [] ? 1 : 0;
            $overall += $ranked === [] ? 1.0 : 0.0;
            $perRequest[$r['id']] = ['ranked' => array_slice($ranked, 0, K), 'empty' => true, 'ok' => $ranked === [],
                'score' => $ranked === [] ? 1.0 : 0.0];
            continue;
        }
        $m = metrics($ranked, $gt);
        foreach ($m as $k => $v) {
            $sum[$k] += $v;
        }
        $n++;
        $overall += $m['ndcg'];
        $perRequest[$r['id']] = ['ranked' => array_slice($ranked, 0, K), 'score' => $m['ndcg']] + $m;
    }
    $avg = array_map(static fn(float|int $v): float => $n ? round($v / $n, 4) : 0.0, $sum);
    // Overall = mean over ALL requests of nDCG@5, where a request with no admissible offer
    // scores 1 only if nothing is shown. This is the tuning objective.
    $total = $n + $emptyN;
    return $avg + ['overall' => $total ? round($overall / $total, 4) : 0.0, 'n' => $n,
        'emptyCorrect' => "$emptyOk/$emptyN", 'perRequest' => $perRequest];
}

$scores = [];
$rankMs = [];
foreach ($variants as $key => $variant) {
    foreach ($requests as $r) {
        $t = microtime(true);
        $scores[$key][$r['id']] = semantic($variant, $r, $queries[$r['id']], $candidates, $legacy, $legacyDocs);
        $cands = array_map(static fn(array $c): array => ['semantic' => $scores[$key][$r['id']][$c['id']], 'semanticVia' => 'text'] + $c, $candidates);
        MatchingEngine::rank(requestInput($r), $cands, 0.4, 20);
        $rankMs[$key][] = (microtime(true) - $t) * 1000;
    }
}

$dev = array_keys(array_filter($split, static fn(string $s): bool => $s === 'dev'));
$test = array_keys(array_filter($split, static fn(string $s): bool => $s === 'test'));
$grid = range(0.10, 0.70, 0.05);
$results = [];
foreach ($variants as $key => $variant) {
    $best = null;
    foreach ($grid as $th) {
        $th = round($th, 2);
        $m = evaluate($scores[$key], $requests, $truth, $candidates, $dev, $th);
        // Objective on DEV: overall score (nDCG@5 + correct empty answers), then precision of shown results.
        $objective = [$m['overall'], $m['shown']];
        if ($best === null || $objective > $best['objective']) {
            $best = ['threshold' => $th, 'objective' => $objective, 'dev' => $m];
        }
    }
    $default = $variant[1] === 'legacy' ? 0.0 : ($variant[1] === 'bm25' ? 0.28 : MatchingEngine::DEFAULT_MIN_SEMANTIC);
    $results[$key] = [
        'label' => $variant[0],
        'tunedThreshold' => $best['threshold'],
        'dev' => $best['dev'],
        'test' => evaluate($scores[$key], $requests, $truth, $candidates, $test, $best['threshold']),
        'testAtPrototypeDefault' => ['threshold' => $default] + evaluate($scores[$key], $requests, $truth, $candidates, $test, $default),
        'all' => evaluate($scores[$key], $requests, $truth, $candidates, array_keys($split), $best['threshold']),
        'rankMsMedian' => round(median($rankMs[$key]), 2),
    ];
}

function median(array $xs): float
{
    if ($xs === []) {
        return 0.0;
    }
    sort($xs);
    $n = count($xs);
    return $n % 2 ? $xs[intdiv($n, 2)] : ($xs[$n / 2 - 1] + $xs[$n / 2]) / 2;
}
function p95(array $xs): float
{
    if ($xs === []) {
        return 0.0;
    }
    sort($xs);
    return $xs[(int)min(count($xs) - 1, ceil(0.95 * count($xs)) - 1)];
}

$latency = [];
foreach ($timing as $k => $xs) {
    $latency[$k] = ['n' => count($xs), 'medianMs' => round(median($xs)), 'p95Ms' => round(p95($xs))];
}

/**
 * Paired bootstrap over TEST requests of the per-request score (nDCG@5, or 1/0 for
 * "nothing to show" requests), each variant at its dev-tuned threshold.
 * @return array{diff:float, low:float, high:float}
 */
function pairedBootstrap(array $a, array $b, int $rounds = 5000): array
{
    $ids = array_keys($a);
    $diffs = [];
    mt_srand(20261125);
    for ($i = 0; $i < $rounds; $i++) {
        $sum = 0.0;
        foreach ($ids as $_) {
            $id = $ids[mt_rand(0, count($ids) - 1)];
            $sum += $a[$id] - $b[$id];
        }
        $diffs[] = $sum / count($ids);
    }
    sort($diffs);
    $mean = (array_sum($a) - array_sum($b)) / count($ids);
    return ['diff' => round($mean, 3), 'low' => round($diffs[(int)(0.025 * $rounds)], 3), 'high' => round($diffs[(int)(0.975 * $rounds) - 1], 3)];
}
$testScores = static fn(string $key): array => array_map(static fn(array $x): float => (float)$x['score'], $results[$key]['test']['perRequest']);
$comparisons = [];
foreach ([['M2', 'M1', 'BM25 trong kênh văn bản (không có ảnh)'], ['M4', 'M3', 'BM25 trong kênh văn bản (có ảnh)'],
    ['M4', 'M2', 'Kênh ảnh (khi đã có BM25)'], ['M4', 'B1', 'Hệ thống AI so với chỉ dùng từ khóa'],
    ['M4', 'B0', 'Hệ thống AI so với baseline cũ']] as [$a, $b, $what]) {
    $comparisons[] = ['a' => $a, 'b' => $b, 'what' => $what] + pairedBootstrap($testScores($a), $testScores($b));
}
// The deployed configuration (threshold 0.40) on all 30 requests, for error analysis.
$deployed = evaluate($scores['M4'], $requests, $truth, $candidates, array_keys($split), MatchingEngine::DEFAULT_MIN_SEMANTIC);

$out = [
    'comparisons' => $comparisons,
    'deployedAllRequests' => $deployed,
    'generatedAt' => date('c'),
    'model' => $gemini->modelKey(),
    'dataset' => ['requests' => count($requests), 'offers' => count($offers),
        'withGroundTruth' => count(array_filter($truth)), 'emptyGroundTruth' => count($truth) - count(array_filter($truth))],
    'split' => ['dev' => $dev, 'test' => $test],
    'k' => K,
    'variants' => $results,
    'latency' => ['embeddingCallsThisRun' => $latency, 'note' => $refresh || array_sum(array_column($latency, 'n')) > 0
        ? 'Cold timings measured in this run.' : 'All vectors came from cache: no embedding call (warm run).'],
];
if (!is_dir(__DIR__ . '/results')) {
    mkdir(__DIR__ . '/results', 0777, true);
}
file_put_contents(__DIR__ . '/results/benchmark_w8.json', json_encode($out, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

// ---- Console summary ----
printf("Dataset: %d requests (%d with ground truth, %d expect no result), %d offers. Split dev %d / test %d.\n",
    $out['dataset']['requests'], $out['dataset']['withGroundTruth'], $out['dataset']['emptyGroundTruth'],
    count($offers), count($dev), count($test));
printf("%-4s %-42s %4s | %s | %s\n", 'id', 'variant', 'thr', 'TEST overall shown R@5  MRR  nDCG empty', 'TEST @default thr: overall shown nDCG');
foreach ($results as $key => $v) {
    $t = $v['test'];
    $d = $v['testAtPrototypeDefault'];
    printf("%-4s %-42s %4.2f | %.2f    %.2f  %.2f %.2f %.2f %s | (%.2f) %.2f %.2f %.2f\n", $key, $v['label'], $v['tunedThreshold'],
        $t['overall'], $t['shown'], $t['r'], $t['mrr'], $t['ndcg'], $t['emptyCorrect'], $d['threshold'], $d['overall'], $d['shown'], $d['ndcg']);
}
foreach ($latency as $k => $l) {
    if ($l['n']) {
        printf("latency %-11s n=%d median %d ms p95 %d ms\n", $k, $l['n'], $l['medianMs'], $l['p95Ms']);
    }
}
foreach ($comparisons as $c) {
    printf("%s - %s (%s): %+.3f  95%% CI [%+.3f, %+.3f]\n", $c['a'], $c['b'], $c['what'], $c['diff'], $c['low'], $c['high']);
}
fwrite(STDOUT, "Wrote scripts/eval/results/benchmark_w8.json\n");

// ---- Markdown report (Vietnamese, for the thesis) ----
$f2 = static fn(float $x): string => number_format($x, 2, ',', '');
$md = [];
$md[] = '# Báo cáo benchmark W8: ghép nối REQUEST–OFFER trên pipeline thật';
$md[] = '';
$md[] = '> File này được sinh tự động bởi `php scripts/eval/run-benchmark.php` lúc ' . date('d/m/Y H:i') . '.';
$md[] = '> Kết quả tái tạo được không cần API key: vector Gemini được lưu ở `scripts/eval/cache/`.';
$md[] = '';
$md[] = '## 1. Thiết lập';
$md[] = '';
$md[] = sprintf('- **Dữ liệu:** %d REQUEST, %d OFFER (`database/demo/marketplace`, danh mục thật, không có xe cộ). %d REQUEST có đáp án; %d REQUEST không có món nào thỏa điều kiện (hệ thống đúng khi không hiện gì).',
    count($requests), count($offers), $out['dataset']['withGroundTruth'], $out['dataset']['emptyGroundTruth']);
$md[] = '- **Đáp án đúng (ground truth):** OFFER có nhãn ngữ nghĩa ≥ 1 (2 = đúng loại đồ, 1 = liên quan gần) **và** không vi phạm điều kiện bắt buộc theo đúng `MatchingEngine` đang chạy.';
$md[] = sprintf('- **Chia tập cố định:** sắp theo kịch bản rồi mã REQUEST, xen kẽ dev/test → dev %d, test %d. Tham số duy nhất được tinh chỉnh (ngưỡng ngữ nghĩa) chọn **trên dev**; các con số chính báo cáo **trên test**.',
    count($dev), count($test));
$md[] = '- **Chỉ số (k = 5):** nDCG@5 (có phân hạng 2/1), MRR, Recall@5, *Độ chính xác hiển thị* (tỉ lệ món đúng trong những món hệ thống hiện ra, tối đa 5). *Overall* = trung bình trên mọi REQUEST của nDCG@5, trong đó REQUEST "không có hàng" được 1 điểm nếu hệ thống không hiện gì: đây là mục tiêu tinh chỉnh.';
$md[] = '- **Mô hình:** `' . $gemini->modelKey() . '` (Gemini Embedding 2, 768 chiều); xếp hạng cuối bằng `MatchingEngine` (0,75 ngữ nghĩa + 0,25 cấu trúc, lọc điều kiện bắt buộc).';
$md[] = '';
$md[] = '## 2. Kết quả trên tập TEST';
$md[] = '';
$md[] = '| Mã | Biến thể | Ngưỡng (chọn trên dev) | Overall | nDCG@5 | MRR | Recall@5 | Độ chính xác hiển thị | "Không có hàng" đúng |';
$md[] = '|---|---|---|---|---|---|---|---|---|';
foreach ($results as $key => $v) {
    $t = $v['test'];
    $md[] = sprintf('| %s | %s | %s | **%s** | %s | %s | %s | %s | %s |', $key, $v['label'], $f2($v['tunedThreshold']),
        $f2($t['overall']), $f2($t['ndcg']), $f2($t['mrr']), $f2($t['r']), $f2($t['shown']), $t['emptyCorrect']);
}
$md[] = '';
$md[] = 'Cùng tập TEST nhưng dùng ngưỡng mặc định của prototype (không tinh chỉnh), để đối chiếu:';
$md[] = '';
$md[] = '| Mã | Ngưỡng | Overall | nDCG@5 | Độ chính xác hiển thị | "Không có hàng" đúng |';
$md[] = '|---|---|---|---|---|---|';
foreach ($results as $key => $v) {
    $d = $v['testAtPrototypeDefault'];
    $md[] = sprintf('| %s | %s | %s | %s | %s | %s |', $key, $f2($d['threshold']), $f2($d['overall']), $f2($d['ndcg']), $f2($d['shown']), $d['emptyCorrect']);
}
$md[] = '';
$md[] = '## 3. Ablation (bootstrap ghép cặp 5000 lần trên TEST, khoảng tin cậy 95%)';
$md[] = '';
$md[] = '| So sánh | Thành phần được kiểm chứng | Chênh lệch Overall | KTC 95% | Kết luận |';
$md[] = '|---|---|---|---|---|';
foreach ($comparisons as $c) {
    $verdict = $c['low'] > 0 ? 'Có ích, khác biệt có ý nghĩa' : ($c['high'] < 0 ? 'Làm giảm chất lượng' : 'Chưa đủ bằng chứng (KTC chứa 0)');
    $md[] = sprintf('| %s vs %s | %s | %+.3f | [%+.3f; %+.3f] | %s |', $c['a'], $c['b'], $c['what'], $c['diff'], $c['low'], $c['high'], $verdict);
}
$md[] = '';
$md[] = '## 4. Cấu hình đang chạy thật (M4, ngưỡng 0,40) trên toàn bộ 30 REQUEST';
$md[] = '';
$md[] = sprintf('Overall %s · nDCG@5 %s · MRR %s · Độ chính xác hiển thị %s · "Không có hàng" đúng %s.',
    $f2($deployed['overall']), $f2($deployed['ndcg']), $f2($deployed['mrr']), $f2($deployed['shown']), $deployed['emptyCorrect']);
$md[] = '';
$md[] = 'Các REQUEST chưa đạt điểm tối đa (phân tích lỗi):';
$md[] = '';
$md[] = '| REQUEST | Kịch bản | Mô tả | Đáp án | Hệ thống hiện (top 5) | Điểm |';
$md[] = '|---|---|---|---|---|---|';
$byId = array_column($requests, null, 'id');
foreach ($deployed['perRequest'] as $rid => $pr) {
    if ($pr['score'] >= 0.999) {
        continue;
    }
    $gt = implode(', ', array_map(static fn(int $id): string => $refById[$id] . ($truth[$rid][$id] === 2 ? '' : '(1)'), array_keys($truth[$rid]))) ?: '— (không có hàng)';
    $shown = implode(', ', array_map(static fn(int $id): string => $refById[$id] . (isset($truth[$rid][$id]) ? '✓' : ''), $pr['ranked'])) ?: '(không hiện gì)';
    $md[] = sprintf('| %s | %s | %s | %s | %s | %s |', $rid, $byId[$rid]['scenario'], str_replace('|', '/', $byId[$rid]['description']), $gt, $shown, $f2($pr['score']));
}
$md[] = '';
$md[] = '## 5. Độ trễ';
$md[] = '';
$md[] = '| Bước | Số lần gọi | Trung vị | p95 |';
$md[] = '|---|---|---|---|';
$names = ['queryText' => 'Nhúng câu truy vấn (văn bản), gọi API', 'queryImage' => 'Nhúng ảnh truy vấn, gọi API',
    'offerText' => 'Nhúng một tin đăng (văn bản), một lần khi duyệt tin', 'offerImage' => 'Nhúng ảnh tin đăng, một lần khi duyệt tin'];
foreach ($latency as $k => $l) {
    if ($l['n']) {
        $md[] = sprintf('| %s | %d | %d ms | %d ms |', $names[$k], $l['n'], $l['medianMs'], $l['p95Ms']);
    }
}
$md[] = sprintf('| Chấm điểm + xếp hạng 41 tin khi đã có vector (warm), M4 | 30 | %s ms | |', $f2($results['M4']['rankMsMedian']));
if (array_sum(array_column($latency, 'n')) === 0) {
    $md[] = '';
    $md[] = '*Lần chạy này lấy mọi vector từ cache nên không đo lại độ trễ gọi API; chạy `--refresh` để đo.*';
}
$md[] = '';
$md[] = '## 6. Giới hạn';
$md[] = '';
$md[] = '- Bộ dữ liệu nhỏ (30 REQUEST, 15 ở test): khoảng tin cậy rộng, nên chênh lệch nhỏ giữa các ngưỡng nằm trong mức nhiễu.';
$md[] = '- Chỉ 4 OFFER và 2 REQUEST có ảnh, nên đóng góp của kênh ảnh mới là bằng chứng sơ bộ.';
$md[] = '- Nhãn ngữ nghĩa do nhóm tự gán (một người gán), chưa đo độ đồng thuận giữa người gán.';
$md[] = '- Hằng số hiệu chỉnh từng kênh lấy từ prototype; W8 chỉ tinh chỉnh ngưỡng trên dev.';
@mkdir(ROOT . '/docs', 0777, true);
file_put_contents(ROOT . '/docs/BAO_CAO_BENCHMARK_W8.md', implode("\n", $md) . "\n");
fwrite(STDOUT, "Wrote docs/BAO_CAO_BENCHMARK_W8.md\n");
