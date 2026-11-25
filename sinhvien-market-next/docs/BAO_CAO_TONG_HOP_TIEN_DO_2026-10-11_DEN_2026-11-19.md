# Báo cáo tổng hợp quá trình phát triển SinhVienMarket

**Thời gian báo cáo:** 11/10/2026–19/11/2026  
**Ngày chốt nội dung:** 19/11/2026  
**Dự án:** SinhVienMarket – nền tảng quản lý ký túc xá, dịch vụ sinh viên và giao dịch nội bộ  
**Kiến trúc đã chốt:** Next.js frontend + PHP MVC modular monolith + MySQL/MariaDB  
**Trạng thái:** Prototype/đồ án; chưa được xác nhận là hệ thống production-ready.

> Báo cáo tổng hợp các thay đổi và hoạt động có bằng chứng trong Git, tài liệu dự án và lịch sử thực hiện. Git hiện chỉ ghi nhận các commit của giai đoạn này từ 30/10/2026; do đó không gán ngày hoàn thành chính xác cho những việc chuẩn bị hoặc thay đổi chưa commit trong khoảng 11–29/10. Báo cáo cũng tách riêng nhánh `main` với nhánh thử nghiệm AI để tránh hiểu nhầm rằng mọi hạng mục đã được hợp nhất.

## 1. Tóm tắt điều hành

Trong giai đoạn báo cáo, dự án đi qua hai hướng phát triển liên quan:

1. **Chuyển giao diện và luồng người dùng/quản trị sang Next.js**, đồng thời giữ PHP MVC và MySQL làm backend, tiếp tục phục vụ API, phiên đăng nhập, nghiệp vụ và tích hợp thanh toán.
2. **Mở rộng SinhVienMarket thành nền tảng quản lý KTX**, với các phân hệ hồ sơ/lưu trú, phòng/giường, dịch vụ, mặt bằng, tài chính, thông tin KTX và hỗ trợ vận hành.

Các luồng marketplace hiện hữu như đăng tin, tìm sản phẩm, chat, giao dịch, thông báo, wishlist, hồ sơ và quản trị được duy trì hoặc chuyển dần sang Next.js. Phần KTX được tổ chức thành các migration và API bổ sung, không thay PHP bằng Laravel hay thêm một backend Node.js.

Đến 19/11/2026:

- Nhánh `main` có commit `1b5a928` (`feat: complete dormitory platform weeks 1-16`), được push lên GitHub ngày 13/11. Commit này đưa phần lớn nền tảng KTX tuần 1–16, tài liệu bàn giao, migration và các thay đổi tích hợp vào `main`.
- Nhánh `feature/nextjs-frontend` có commit `d35416e` (`feat(ai-matching): ...`) với một prototype REQUEST–OFFER đa phương thức và bộ thử nghiệm Gemini Embedding 2/Jina-CLIP-v2. **Nhánh này không chứa commit `main` mới nhất và prototype chưa được tích hợp vào `main`.**
- Kiểm thử của phần KTX và frontend trên nhánh triển khai đã đạt các mốc được ghi nhận: PHPUnit 29 test/89 assertions, Vitest 48/48, E2E 22/22, cùng lint, TypeScript và build production.
- Nhánh AI đạt lint, TypeScript sau khi sinh route types, 54/54 unit tests và kiểm tra dataset; tuy nhiên production build trên nhánh này thất bại do cấu hình PostCSS/workspace root. Các metric trong báo cáo AI có số liệu mâu thuẫn và cần hiệu chỉnh trước khi dùng làm kết luận nghiên cứu.
- Việc tạo migration, seed dữ liệu demo, backup/restore và Docker deployment chưa được xác minh như một triển khai hoàn chỉnh. Không nên xem bản demo là hệ thống sẵn sàng thay thế công cụ quản lý KTX thực tế.

## 2. Mốc Git và phạm vi bằng chứng

| Ngày | Mốc | Ý nghĩa |
|---|---|---|
| 11–29/10/2026 | Giai đoạn chuẩn bị và phát triển trước các commit được fetch | Không có commit trong các refs hiện có cho thời gian này. Một số nội dung có thể đã được làm trong working tree hoặc phiên làm việc trước; không suy diễn commit/date cụ thể. |
| 30/10/2026 | `b23f221`, cùng các commit `7b54990`, `8b9de13`, `da2b2a0`, `1a07245`, `e8ddfc4` | Khởi tạo Next.js auth/admin, hoàn thiện các nhóm màn hình quản trị, viết test/API contract và nối điều hướng. |
| 02/11/2026 | `a7ef6a9` | Tích hợp các luồng Next.js người dùng và quản trị vào ứng dụng. |
| 04/11/2026 | Tên migration nền KTX và vận hành | Mốc migration cho identity/lưu trú và inventory/service/rental. Ngày trong tên tệp không đồng nghĩa ngày migration đã chạy trên mọi database. |
| 06/11/2026 | `d35416e` trên `feature/nextjs-frontend` | Bổ sung prototype REQUEST–OFFER, AI lab, dữ liệu benchmark và UI `/requests`. |
| 13/11/2026 | `1b5a928` trên `main` | Commit tích hợp lớn cho tuần 1–16, các migration, API/UI KTX, tài liệu, script demo và một số chỉnh sửa Next/PHP. Đã push lên `origin/main`. |
| 19/11/2026 | Mốc báo cáo | Nhánh checkout tại thời điểm làm báo cáo là `feature/nextjs-frontend` (`d35416e`); `origin/main` là `1b5a928`. Hai nhánh khác nhau. |

### Phân biệt trạng thái hai nhánh

- **`main` / `origin/main` — `1b5a928`:** chứa nền tảng KTX tuần 1–16 và các thay đổi đã push ngày 13/11.
- **`feature/nextjs-frontend` / `origin/feature/nextjs-frontend` — `d35416e`:** chứa prototype AI Matching đa phương thức được đánh giá riêng. Tại thời điểm so sánh, nhánh local này không có các thay đổi mới nhất của `main`; merge thử có conflict tại `sinhvien-market-next/frontend/components/layout/MainShell.tsx`.
- Vì vậy, khi dựng hoặc trình diễn tính năng AI REQUEST–OFFER, cần chọn rõ nhánh và xử lý tích hợp. Không nên kết luận prototype AI đã có mặt trong bản `main`.

## 3. Định hướng sản phẩm và kiến trúc

### 3.1. Định vị

SinhVienMarket được định hướng từ một sàn mua bán sinh viên thành **Smart Dormitory Management & Student Service Platform**: nền tảng mô phỏng hoạt động quản lý KTX, cung cấp dịch vụ sinh viên và tiếp tục giữ sàn giao dịch nội bộ.

Các nhóm nghiệp vụ được xác định:

1. Sinh viên, hồ sơ và lưu trú.
2. Tòa nhà, tầng, phòng, giường và phân bổ.
3. Dịch vụ, sửa chữa và phản ánh.
4. Mặt bằng, hồ sơ thuê và hợp đồng.
5. Marketplace sinh viên và matching.
6. Phí, hóa đơn và ghi nhận thanh toán.
7. Thông báo, sự kiện và nội quy.
8. Quản trị, phân quyền và dashboard vận hành.
9. Các tiện ích AI cục bộ/độc lập, chỉ hỗ trợ nhân viên và người dùng theo quyền.

### 3.2. Quyết định công nghệ

- **Frontend:** Next.js App Router, React, TypeScript; dùng UI/API adapters có mock mode phục vụ phát triển.
- **Backend:** PHP MVC hiện tại, PHP session, JSON APIs, CSRF và lớp nghiệp vụ/model sẵn có. Không chuyển sang Laravel hoặc thay backend bằng Node.js.
- **Database:** MySQL/MariaDB; migration nghiệp vụ KTX được bổ sung theo hướng additive.
- **AI:** baseline cục bộ cho matching và phân loại nghiệp vụ trong nhánh nền tảng; thử nghiệm Gemini/Jina bên ngoài chỉ nằm ở nhánh prototype riêng.
- **Kiến trúc mục tiêu:** modular monolith PHP kết hợp các dịch vụ AI có ranh giới rõ ràng khi cần. Tài liệu AI branch có chỗ mô tả Laravel/PostgreSQL/FastAPI; nội dung này là hợp đồng/đề xuất của prototype, **không phản ánh kiến trúc backend đã chốt cho repository**.

Tài liệu kiến trúc và audit trên nhánh `main` là `docs/KTX_PLATFORM_FOUNDATION.md`. Tài liệu triển khai tuần 9–12 và tuần 13–16 trên `main` tương ứng là `docs/WEEK_9_12_FINANCE_NOTICES_MATCHING.md` và `docs/WEEK_13_16_DELIVERY.md`.

## 4. Công việc theo giai đoạn

### 4.1. Next.js: xác thực và giao diện quản trị

Giai đoạn Next.js đầu tiên tạo nền UI mới, API client, mock adapter, quy tắc validation và các màn hình auth:

- Đăng nhập sinh viên và cổng đăng nhập quản trị.
- Đăng ký, xác minh OTP, quên/đặt lại mật khẩu, thông báo tài khoản bị khóa và chọn cổng đăng nhập.
- Màn hình admin tổng quan và khung điều hướng quản trị.
- Kiểm tra dữ liệu bằng Zod/React Hook Form, hiển thị đồng thời lỗi validation, password strength, trạng thái gửi form và chống bấm gửi lặp.
- Tài khoản demo/mock và luồng kiểm thử giúp phát triển UI mà không cần gọi backend thật ở mọi bước.

Các phase admin sau đó bổ sung:

- Duyệt/từ chối sản phẩm; quản lý danh mục và banner.
- Quản lý người dùng, trang hồ sơ chi tiết và lịch sử vi phạm/khóa.
- Giao dịch, báo cáo, đánh giá, giveaway/vòng quay và audit log.
- Hợp đồng API và test unit/E2E riêng cho các nhóm giao diện.

Tài liệu auth/admin lịch sử gồm [`AUTH_SCREENS.md`](./AUTH_SCREENS.md), [`AUTH_API_CONTRACT.md`](./AUTH_API_CONTRACT.md), [`ADMIN_SCREENS.md`](./ADMIN_SCREENS.md), [`BAO_CAO_TUAN_1_2.md`](./BAO_CAO_TUAN_1_2.md) và `BAO_CAO_TUAN_3.md`.

> Một số tài liệu giai đoạn đầu ghi kiến trúc Node.js như kế hoạch ban đầu. Quyết định về sau của chủ dự án là giữ PHP MVC; cần ưu tiên quyết định và tài liệu nền KTX mới hơn khi có khác biệt.

### 4.2. Chuyển giao diện marketplace/người dùng và tích hợp backend

Các phần giao diện Next.js được mở rộng để bao phủ nhiều luồng đã có trong PHP:

- Trang chủ, danh sách/tìm kiếm sản phẩm và trang chi tiết.
- Tạo/quản lý tin đăng.
- Hồ sơ cá nhân và trang hồ sơ người bán.
- Chat, hội thoại và gửi tin nhắn.
- Danh sách giao dịch, theo dõi trạng thái, checkout và trang hướng dẫn thanh toán.
- Wishlist, thông báo, rewards và dashboard người dùng.
- Leaderboard và điều hướng responsive trên desktop/mobile.

PHP tiếp tục giữ vai trò backend. Các thay đổi tích hợp gồm API marketplace/người dùng/quản trị, route mapping, CSRF/session và xử lý payload JSON; một số luồng được kết nối trực tiếp với database local để kiểm tra. Luồng chat từng có lỗi định dạng giờ do backend trả `HH:mm` trong khi frontend gọi `new Date(...)`; lỗi này được xác định và điều chỉnh để tránh crash khi render.

Một số giới hạn nghiệp vụ vẫn cần giữ rõ:

- Thanh toán residence invoice là ghi nhận/đối soát nội bộ, không đồng nghĩa xác nhận chuyển khoản tự động.
- Marketplace MoMo/ZaloPay có callback/webhook code và test giả lập; không có bằng chứng rằng provider live đã được gọi trong kiểm thử này.
- Luồng đổi hiện vật chưa có workflow giao dịch hoàn chỉnh; không hiển thị như một thanh toán mua bán đã hoàn tất.
- Các tính năng email/OTP phụ thuộc SMTP và không được xác nhận trong mọi môi trường.

### 4.3. PHP page migration và POST JSON

- Các trang giao diện cũ được chuyển hướng sang Next.js; các template PHP không còn cần thiết được loại khỏi commit `1b5a928`, trong khi PHP controller/API và các trang lỗi/backend vẫn được giữ.
- Các GET route cũ được ánh xạ sang trang Next.js bằng cơ chế legacy page redirects.
- Các form POST cũ được chuyển dần khỏi việc render HTML; router/API error handlers trả lỗi JSON cho nhiều tình huống legacy/API.
- Đã bổ sung lớp tập trung nhằm chuẩn hóa response POST không phải JSON thành JSON lỗi, giữ response JSON hợp lệ và loại header redirect/content không phù hợp.

**Giới hạn bằng chứng:** đã có các kiểm tra điểm cho một số POST legacy/API và có test riêng cho normalizer, nhưng không có kết quả được xác nhận bao phủ toàn bộ route POST, shutdown/fatal paths và mọi callback. Vì vậy, yêu cầu “bất kỳ POST nào cũng luôn JSON” cần thêm kiểm thử tích hợp theo danh sách route trước khi được xem là bảo đảm tuyệt đối.

### 4.4. Tuần 1–4: identity, phân quyền và hồ sơ lưu trú

Phân hệ nền tảng đưa vào:

- RBAC bổ sung lên hệ thống user hiện hữu, gồm các vai trò như `student`, `dorm_manager`, `service_staff`, `tenant` và `admin`.
- Permission key được kiểm tra trong PHP backend; việc ẩn nút/route trên giao diện chỉ là UX, không thay thế authorization.
- Hồ sơ sinh viên tách khỏi thông tin tài khoản marketplace.
- Quy trình đăng ký lưu trú, kiểm tra hồ sơ, bắt đầu xét duyệt, phê duyệt/từ chối và lịch sử sự kiện có actor/thời gian/ghi chú.
- Khi duyệt, hệ thống tạo contract trạng thái `pending_assignment`; chưa giả lập việc xếp giường khi inventory chưa được triển khai.
- API PHP và các trang Next.js cho sinh viên/quản lý.

Các bất biến nghiệp vụ gồm từ chối kỳ đăng ký bị chồng lấn, giới hạn chuyển trạng thái hợp lệ và bảo đảm một application không tạo nhiều contract do duyệt lặp. Scope phân quyền theo tòa/tầng/phòng chưa được hoàn thiện; manager hiện có phạm vi rộng của prototype.

### 4.5. Tuần 5–8: cơ sở vật chất, phân giường, dịch vụ và mặt bằng

Phân hệ vận hành bao gồm:

- CRUD tòa nhà → tầng → phòng → giường.
- Phân bổ sinh viên vào giường, kiểm tra lịch phân bổ chồng lấn và ghi lịch sử.
- Chuyển phòng/giường, đóng allocation cũ và tạo allocation mới từ ngày hiệu lực.
- Danh sách hợp đồng chờ xếp giường và tra cứu giường còn trống.
- Yêu cầu dịch vụ/sửa chữa/phản ánh, phân công nhân viên và cập nhật trạng thái/ghi chú.
- Quản lý mặt bằng cho thuê, hồ sơ xin thuê, xét duyệt và hợp đồng.
- Trang quản lý vận hành, dịch vụ sinh viên và trang thuê mặt bằng trên Next.js.

Các guard nghiệp vụ chặn giảm sức chứa phòng thấp hơn số giường đang khai báo, xóa inventory đang được tham chiếu và tạo lịch lưu trú/thuê bị trùng theo quy tắc trong model. Test E2E mock mô phỏng luồng sinh viên nộp hồ sơ và quản lý duyệt.

### 4.6. Tuần 9–12: tài chính KTX, thông tin và matching marketplace

Tài chính và thông tin:

- Danh mục phí, hóa đơn và chi tiết hóa đơn.
- Ghi nhận thanh toán với trạng thái chờ/xác nhận/từ chối; kiểm tra số tiền so với dư nợ và đối soát theo transaction/lock trong model.
- Thông báo, sự kiện và nội quy có audience, trạng thái và thời gian hiển thị.
- Giao diện sinh viên xem hóa đơn, ghi nhận thanh toán và xem thông tin KTX; giao diện quản lý tạo hóa đơn, quản lý fee category, review thanh toán và thông báo.

Matching baseline trong nhánh nền tảng:

- Tìm trên các sản phẩm đang hoạt động, có lọc danh mục/giá/tình trạng/loại tin.
- Embedding được tạo cục bộ bằng signed feature hashing 256 chiều trên token và cặp token liền kề, lưu dạng JSON có model key và content hash.
- Dùng cosine similarity, candidate scan giới hạn cho quy mô demo.
- Lưu kết quả đánh giá thủ công bằng P@5, Recall@5, MRR@5 và NDCG@5.

Đây là **baseline lexical có thể tái lập**, không phải mô hình ngôn ngữ đã huấn luyện, không hiểu ảnh và không đảm bảo bắt được đồng nghĩa. Tài liệu giải thích rõ giới hạn trong [`WEEK_9_12_FINANCE_NOTICES_MATCHING.md`](../../docs/WEEK_9_12_FINANCE_NOTICES_MATCHING.md).

### 4.7. Tuần 13–16: AI hỗ trợ vận hành, kiểm thử và demo

AI/triage cục bộ:

- Phân loại yêu cầu sửa chữa theo từ khóa tiếng Việt; đề xuất danh mục/độ ưu tiên/độ tin cậy.
- Bộ phân loại chỉ đưa ra gợi ý; không tự chuyển trạng thái hoặc tự áp dụng độ ưu tiên.
- Trợ lý nội quy truy xuất nội quy đã công bố, lọc audience theo quyền/hợp đồng lưu trú và không đọc hóa đơn, hồ sơ cá nhân hay nội dung yêu cầu sửa chữa.
- Dashboard vận hành trả số liệu tổng hợp, không hiển thị tên/email/ghi chú/mã định danh cư dân.

Bảo mật/thanh toán:

- Test giả lập chữ ký MoMo/ZaloPay, đối chiếu tham chiếu, phương thức, số tiền và trạng thái thanh toán.
- Kiểm tra callback giả lập và luồng lặp tuần tự; không gọi provider thật.
- Backup/restore chỉ cho phép database demo có tên cụ thể; restore yêu cầu chuỗi xác nhận.
- Seed demo từ chối database ngoài allowlist và tránh tạo credential cố định.

Đóng gói/bàn giao:

- Bổ sung Dockerfile/Compose cho môi trường phát triển và stack demo độc lập với volume MySQL riêng.
- Tài liệu runbook, báo cáo tuần 13–16 và kịch bản trình diễn.
- Cấu hình demo được thiết kế để không publish cổng DB ra ngoài.

**Chưa xác nhận:** không có bằng chứng Docker demo đã build/chạy thành công; backup/restore chưa thực thi; migration mới nhất cho quyền AI/classification chưa được xác nhận đã áp dụng; seed demo không được chạy vào database hiện tại.

### 4.8. Prototype AI REQUEST–OFFER trên `feature/nextjs-frontend`

Commit `d35416e` bổ sung riêng:

- Trang `/requests` và UI tạo/tìm REQUEST, xem OFFER, lọc/tìm kiếm, chọn điều kiện hard/soft và xem gợi ý counterfactual.
- Engine có kiểm tra hard constraints, scoring theo cấu trúc, xếp hạng và đề xuất nới một hoặc hai điều kiện mềm.
- Baseline keyword BM25 tiếng Việt và đối chiếu embedding Gemini Embedding 2/Jina-CLIP-v2.
- AI lab Python, provider adapters, cache vector có model/version/hash, dataset 44 OFFER/31 REQUEST và ảnh mẫu.
- API route Next.js `/api/ai/match` gọi provider khi có API key.
- Unit/E2E tests và snapshot benchmark đưa vào frontend.

Giới hạn và vấn đề trước khi tích hợp:

1. OFFER/REQUEST trong giao diện là dữ liệu JSON demo; request tự tạo lưu `localStorage`, không lưu vào PHP/MySQL và không dùng marketplace listing production.
2. Contract tài liệu mô tả Laravel/FastAPI/PostgreSQL/pgvector, nhưng PHP MVC/MySQL mới là backend đã chốt.
3. API proxy AI không có đủ xác thực, rate limit, giới hạn payload/ảnh hoặc spend control được xác nhận; có thể bị lạm dụng để tiêu quota API.
4. Nếu gọi embedding thất bại, adapter có thể fallback sang BM25 nhưng vẫn giữ model ID người dùng chọn, gây nhãn kết quả sai.
5. Benchmark report có số liệu Jina không khớp giữa bảng và phần khuyến nghị; thời gian benchmark có thể đo cache warm thay vì cold/provider latency.
6. Build nhánh này thất bại do Next.js nhận PostCSS config ở root không phù hợp Tailwind v4; cũng có cảnh báo nhiều lockfile và workspace root. Không có E2E pass được xác nhận cho nhánh prototype.
7. Có merge conflict trên `MainShell.tsx` khi thử hợp nhất với `main`.

Kết luận cho phần AI: phù hợp làm prototype nghiên cứu và trình diễn logic trên dữ liệu mẫu; **chưa phù hợp đưa nguyên trạng vào nghiệp vụ marketplace thật**. Yêu cầu chi tiết được ghi trong [`AI_REQUEST_OFFER_SPEC.md`](./AI_REQUEST_OFFER_SPEC.md), contract và benchmark tại các tài liệu AI cùng thư mục.

## 5. Dữ liệu, migration và API

### 5.1. Migration chính

| Tệp | Phạm vi |
|---|---|
| `database/migrations/20261104_ktx_foundation.sql` | Permission/RBAC, hồ sơ sinh viên, đơn lưu trú, event history và contract. |
| `database/migrations/20261104_ktx_operations.sql` | Building/floor/room/bed, allocation/history, service request, rental spaces/applications/contracts. |
| `database/migrations/20261113_week9_12_finance_notices_matching.sql` | Fee category, invoice/lines, payments, notices, embedding và evaluation matching. |
| `database/migrations/20261114_week13_14_local_intelligence.sql` | Permission cho AI cục bộ/dashboard và bảng classification yêu cầu dịch vụ. |

Các migration là additive và cần chạy theo thứ tự sau khi database nền đã tồn tại. `database/schema.sql` là schema khởi tạo/reset có lệnh phá hủy dữ liệu; không dùng để nâng cấp database đang có. Trạng thái áp dụng migration cần xác minh trực tiếp trên database đích trước khi chạy API hoặc demo.

### 5.2. API conventions

- PHP front controller và router hiện tại tiếp tục đăng ký các endpoint marketplace, auth, admin, residence, finance, notice, matching, rentals và chat.
- Session cookie và CSRF token được dùng cho API mutation.
- JSON success/error envelopes được chuẩn hóa cho Next.js API client.
- Permission enforcement thuộc backend; client-side role gate không phải security boundary.
- External AI provider API trong prototype branch là ngoại lệ chưa được nối vào permission/API contract PHP.

## 6. Kiểm thử và xác minh

| Nhóm | Kết quả được ghi nhận | Phạm vi/giới hạn |
|---|---|---|
| PHPUnit cho nhánh nền tảng | **29 tests, 89 assertions passed** | Chạy sau khi khởi động MariaDB; không chứng minh mọi migration/API mới đã chạy trên production. |
| Vitest trước prototype AI | **48/48 passed** | Bộ unit tests frontend trên nhánh nền tảng. |
| E2E trước prototype AI | **22/22 passed** | Chạy mock mode, gồm luồng application → admin review; một lần đo login vượt ngưỡng đã được xử lý bằng prefetch `/products`, sau đó đạt. |
| Frontend lint/TypeScript/build trên nhánh nền tảng | Đạt theo lần kiểm tra cuối của giai đoạn | Build production thành công trên cấu hình/nhánh tương ứng. |
| PHP syntax / `git diff --check` | Đạt theo các lần kiểm tra đã ghi | Không thay thế integration test cho từng API/migration. |
| AI branch lint | Đạt | Nhánh `feature/nextjs-frontend`. |
| AI branch Vitest | **54/54 passed** | Unit tests cho engine/demo data; không chứng minh backend persistence. |
| AI branch TypeScript | Đạt sau `next typegen` | Typecheck, không phải production build. |
| AI dataset validator | Đạt: 44 offers, 31 requests, 4 offers có ảnh; schema/labels/files hợp lệ | Validator còn chạy BM25/oracle self-check; không tái chạy provider benchmark live. |
| AI branch production build | **Không đạt** | Tailwind/PostCSS config bị lấy từ root; workspace có nhiều lockfiles. |
| AI branch E2E | Chưa có kết quả pass được xác nhận | Không dùng các test E2E mock ở nhánh khác để khẳng định branch này đã pass. |
| Provider/gateway live | Chưa kiểm thử | Không gọi Gemini/Jina production key hoặc cổng thanh toán thật trong xác minh này. |
| Docker demo, backup/restore | Chưa thực thi | Docker CLI không sẵn có tại một lần kiểm tra; script chỉ được parse/review. |

## 7. Rủi ro và hạng mục còn thiếu

### Ưu tiên cao trước khi dùng với dữ liệu thật

1. **Idempotency webhook đồng thời:** test hiện bao phủ callback lặp tuần tự; phần cập nhật trạng thái có nguy cơ race nếu nhiều callback xử lý cùng lúc. Cần khóa/CAS/transaction và test concurrency trên DB cô lập.
2. **AI endpoint public:** bổ sung auth/authorization, per-user/IP rate limit, giới hạn text/ảnh, xác thực MIME/byte size, timeout và giới hạn chi phí; không expose proxy có server API key mà không có guard.
3. **Kết nối REQUEST–OFFER vào PHP:** tạo model/schema/API lưu REQUEST, lấy OFFER đang hoạt động từ MySQL, quyền sở hữu, trạng thái tin, hết hạn và kiểm soát dữ liệu cá nhân.
4. **Fallback minh bạch:** nếu embedding unavailable thì trả model thực tế là BM25 hoặc trạng thái không khả dụng; không gắn nhãn sai.
5. **Kiểm định benchmark:** thống nhất labels/denominator, tái tạo metrics từ artifact nguồn, báo cáo cold/warm latency và provider calls riêng.
6. **Phân quyền theo phạm vi:** giới hạn quản lý theo tòa/tầng/phòng/nhóm dịch vụ; RBAC hiện tại là prototype và chưa cung cấp đủ scope filtering.
7. **Migration/database:** xác nhận migration table trên đúng database, chạy test integration trên database riêng; không dùng schema destructive trên DB hiện hữu.

### Ưu tiên hoàn thiện sản phẩm

- Xác nhận OTP/email, Google OAuth và admin login trên môi trường tích hợp thật.
- Bổ sung workflow nghiệm thu/chuyển phòng, ký hợp đồng, xác nhận thanh toán và xử lý khiếu nại phù hợp nghiệp vụ thực.
- Dùng dữ liệu demo giả lập; nếu có dữ liệu thật cần consent, phân quyền, retention, audit và quy trình bảo vệ dữ liệu cá nhân.
- Chạy Docker build, health check, migration, seed và backup/restore trong một môi trường demo cô lập.
- Cập nhật các README/báo cáo cũ còn nói Node.js backend hoặc dùng metric AI không khớp.

## 8. Đánh giá mức độ hoàn thành

| Lĩnh vực | Đánh giá tại ngày 19/11/2026 |
|---|---|
| Next.js UI nền tảng và admin | Khá hoàn chỉnh cho prototype; nhiều màn hình và luồng đã có unit/E2E coverage. |
| PHP MVC + MySQL | Vẫn là backend chính; một số API đã nối DB và có test, nhưng cần xác nhận migration/coverage theo môi trường. |
| Sinh viên/lưu trú | Có nền RBAC, profile, application review, history và contract pending assignment. |
| Phòng/giường/dịch vụ/mặt bằng | Có CRUD/workflows và kiểm tra chồng lấn trong code; cần DB-backed integration verification trên database sạch. |
| Tài chính/thông tin KTX | Có invoice/payment record/notice APIs và UI; ghi nhận thanh toán không đồng nghĩa provider verification. |
| AI nội bộ tuần 13–14 | Cục bộ, explainable/keyword baseline, có access filtering được mô tả; không phải AI tổng quát. |
| AI Request–Offer Gemini/Jina | Prototype tách branch; dữ liệu mẫu, quota/security/reporting/build còn vấn đề; chưa tích hợp vào main. |
| Bảo mật production | Chưa đạt mức chứng nhận production; cần concurrency review, threat model, scope authorization, rate limit và kiểm thử cấu hình. |
| Docker/demo handoff | Có cấu hình và tài liệu; chưa xác nhận deploy/restore thực tế. |

**Kết luận:** Giai đoạn này xây được nền tảng đồ án rộng, có luồng nghiệp vụ và nhiều giao diện kiểm thử được. Thành quả phù hợp cho demo/prototype và làm cơ sở tiếp tục phát triển. Chưa đủ bằng chứng để tuyên bố hệ thống đã sẵn sàng vận hành tại một ký túc xá thật.

## 9. Lộ trình đề xuất tiếp theo

1. **Ổn định nhánh:** chọn `main` làm nền tích hợp, đưa AI prototype vào một PR riêng; giải quyết conflict menu và không gộp dữ liệu mẫu như dữ liệu thật.
2. **Hoàn tất migration verification:** tạo database test/demo mới, chạy schema nền và migration tuần tự, xác minh rollback/backup; không chạm DB người dùng.
3. **Gia cố payment callbacks:** atomic update/idempotency concurrency test, kiểm tra amount/reference/provider secrets và log có thể audit.
4. **Thiết kế API REQUEST–OFFER trên PHP MVC:** schema, lifecycle/ownership, search eligible listings và authorization; bỏ JSON/localStorage làm nguồn nghiệp vụ.
5. **Bảo vệ AI provider route:** auth, rate limiting, payload validation, timeout, provider budget và explicit fallback status.
6. **Tái lập benchmark:** khóa dataset/labels/version, sinh metrics từ một artifact duy nhất, tách latency nhúng khỏi latency truy vấn cache.
7. **Kiểm thử Docker demo:** chỉ trên volume/database `sinhvien_market_demo`, chạy seed/backup/restore và kiểm tra health; không sử dụng `database/schema.sql` trên database hiện hữu.
8. **Rà tài liệu và demo:** cập nhật kiến trúc thống nhất PHP MVC/MySQL, ghi rõ giới hạn, dữ liệu giả lập, các test đã chạy và các hạng mục chưa được xác minh.

## 10. Tài liệu và mã nguồn tham chiếu

- Nền tảng KTX trên `main`: `docs/KTX_PLATFORM_FOUNDATION.md`
- Tuần 9–12 trên `main`: `docs/WEEK_9_12_FINANCE_NOTICES_MATCHING.md`
- Tuần 13–16 trên `main`: `docs/WEEK_13_16_DELIVERY.md`, `docs/DEMO_RUNBOOK.md`
- AI REQUEST–OFFER prototype: [`AI_REQUEST_OFFER_SPEC.md`](./AI_REQUEST_OFFER_SPEC.md), [`AI_MATCHING_API_CONTRACT.md`](./AI_MATCHING_API_CONTRACT.md), [`BAO_CAO_SO_SANH_EMBEDDING.md`](./BAO_CAO_SO_SANH_EMBEDDING.md)
- Backend chính: `app/controllers/ResidenceApiController.php`, `ResidenceFinanceApiController.php`, `MarketplaceMatchingApiController.php`; models/services tương ứng trong `app/models/` và `app/services/`.
- Frontend chính: `sinhvien-market-next/frontend/app/` và `sinhvien-market-next/frontend/lib/api/`.

