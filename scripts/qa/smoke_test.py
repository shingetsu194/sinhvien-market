"""W6 smoke test: chạy 3 hành trình demo KTX trên PHP API + MariaDB demo thật.

Chạy: python -I smoke_test.py <base_url> <seed_output_file>
Không dùng mock. Chỉ trỏ vào DB sinhvien_market_demo.
"""
import datetime as dt
import http.cookiejar
import json
import re
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
BASE = sys.argv[1].rstrip("/")
creds = {}
for line in open(sys.argv[2], encoding="utf-8"):
    m = re.match(r"^(\S+@example\.test)\s+([0-9a-f]+)$", line.strip())
    if m:
        creds[m.group(1)] = m.group(2)

results = []


class Client:
    def __init__(self):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        self.csrf = None

    def call(self, method, path, body=None, csrf=True):
        headers = {"Accept": "application/json"}
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if csrf and self.csrf and method != "GET":
            headers["X-CSRF-Token"] = self.csrf
        req = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
        try:
            with self.op.open(req, timeout=20) as r:
                raw, status = r.read().decode("utf-8", "replace"), r.status
        except urllib.error.HTTPError as e:
            raw, status = e.read().decode("utf-8", "replace"), e.code
        try:
            js = json.loads(raw)
        except Exception:
            js = {"_raw": raw[:300]}
        return status, js

    def login(self, email):
        _, js = self.call("GET", "/api/auth/csrf")
        self.csrf = (js.get("data") or {}).get("token")
        st, js = self.call("POST", "/api/auth/login", {"email": email, "password": creds[email], "role": "student"})
        data = js.get("data") or {}
        if data.get("csrfToken"):
            self.csrf = data["csrfToken"]
        return st, js


def check(name, status, js, expect_status, expect_code=None):
    ok = status in (expect_status if isinstance(expect_status, tuple) else (expect_status,))
    code = (js.get("error") or {}).get("code") if isinstance(js.get("error"), dict) else None
    if expect_code is not None:
        ok = ok and code == expect_code
    detail = f"HTTP {status}" + (f" {code}" if code else "")
    if not ok:
        msg = (js.get("error") or {}).get("message") if isinstance(js.get("error"), dict) else js.get("message") or js.get("_raw")
        detail += f" | {msg}"
    results.append((ok, name, detail))
    print(("PASS " if ok else "FAIL ") + name + "  -> " + detail)
    return js.get("data")


today = dt.date.today()
start, end = (today + dt.timedelta(days=7)).isoformat(), (today + dt.timedelta(days=180)).isoformat()
run = dt.datetime.now().strftime("%H%M%S")

stu, mgr, anon = Client(), Client(), Client()

print("=== Bảo mật cơ bản ===")
st, js = anon.call("GET", "/api/student/profile"); check("Chưa đăng nhập bị chặn", st, js, 401)

print("\n=== Hành trình 1: Hồ sơ -> duyệt -> phân giường ===")
st, js = stu.login("demo-student@example.test"); check("SV đăng nhập", st, js, 200)
st, js = stu.call("GET", "/api/auth/me"); me = check("SV /auth/me", st, js, 200) or {}
student_id = (me.get("user") or me).get("id")
st, js = stu.call("POST", "/api/residence/applications", {"startDate": start, "endDate": end}); check("Nộp hồ sơ khi chưa đủ profile -> 409", st, js, 409, "PROFILE_INCOMPLETE")
st, js = stu.call("PUT", "/api/student/profile", {"name": "Demo Sinh viên", "studentNumber": "DEMO" + run, "university": "HUTECH", "faculty": "CNTT"}); check("Cập nhật hồ sơ SV", st, js, 200)
st, js = stu.call("POST", "/api/residence/applications", {"startDate": start, "endDate": end, "preferredRoomType": "standard", "note": "smoke"}, csrf=False); check("Gửi hồ sơ thiếu CSRF bị chặn", st, js, (400, 403, 419))
st, js = stu.call("POST", "/api/residence/applications", {"startDate": start, "endDate": end, "preferredRoomType": "standard", "note": "smoke"}); app = check("Nộp hồ sơ lưu trú", st, js, (200, 201)) or {}
app_id = app.get("id")
st, js = stu.call("POST", "/api/residence/applications", {"startDate": start, "endDate": end}); check("Hồ sơ trùng thời gian -> 409", st, js, 409, "APPLICATION_OVERLAP")
st, js = stu.call("GET", "/api/admin/residence/applications"); check("SV gọi API quản lý bị chặn", st, js, 403)

st, js = mgr.login("demo-manager@example.test"); check("Quản lý đăng nhập", st, js, 200)
st, js = mgr.call("GET", "/api/admin/residence/applications"); apps = check("QL xem danh sách hồ sơ", st, js, 200) or []
st, js = mgr.call("POST", f"/api/admin/residence/applications/{app_id}/review", {"decision": "under_review"}); check("QL bắt đầu xét duyệt", st, js, 200)
st, js = mgr.call("POST", f"/api/admin/residence/applications/{app_id}/review", {"decision": "approve", "note": "OK"}); check("QL phê duyệt -> tạo hợp đồng", st, js, 200)
st, js = mgr.call("POST", f"/api/admin/residence/applications/{app_id}/review", {"decision": "approve"}); check("Duyệt lặp bị chặn -> 409", st, js, 409)
st, js = stu.call("GET", "/api/residence/contracts"); contracts = check("SV xem hợp đồng", st, js, 200) or []
contract = next((c for c in contracts if c.get("applicationId") == app_id), contracts[0] if contracts else {})
results.append((contract.get("status") == "pending_assignment", "Hợp đồng ở trạng thái pending_assignment", str(contract.get("status"))))
print(("PASS " if results[-1][0] else "FAIL ") + results[-1][1] + "  -> " + results[-1][2])

st, js = mgr.call("POST", "/api/admin/residence/buildings", {"code": "A" + run, "name": "Tòa A demo", "address": "KTX", "status": "active"}); b = check("Tạo tòa nhà", st, js, (200, 201)) or {}
st, js = mgr.call("POST", "/api/admin/residence/floors", {"buildingId": b.get("id"), "floorNumber": 3, "name": "Tầng 3"}); f = check("Tạo tầng", st, js, (200, 201)) or {}
st, js = mgr.call("POST", "/api/admin/residence/rooms", {"floorId": f.get("id"), "roomNumber": "A301", "roomType": "standard", "capacity": 2, "status": "active"}); r = check("Tạo phòng (sức chứa 2)", st, js, (200, 201)) or {}
beds = []
for n in ("1", "2"):
    st, js = mgr.call("POST", "/api/admin/residence/beds", {"roomId": r.get("id"), "bedNumber": n, "status": "available"}); beds.append((check(f"Tạo giường {n}", st, js, (200, 201)) or {}).get("id"))
st, js = mgr.call("POST", "/api/admin/residence/beds", {"roomId": r.get("id"), "bedNumber": "3", "status": "available"}); check("Giường vượt sức chứa bị chặn -> 409", st, js, 409)
st, js = mgr.call("PUT", f"/api/admin/residence/rooms/{r.get('id')}", {"floorId": f.get("id"), "roomNumber": "A301", "roomType": "standard", "capacity": 1, "status": "active"}); check("Giảm sức chứa dưới số giường -> 409", st, js, 409)
st, js = mgr.call("GET", "/api/admin/residence/available-beds"); check("Xem giường trống", st, js, 200)
st, js = mgr.call("GET", "/api/admin/residence/allocations"); check("Xem hợp đồng chờ xếp giường", st, js, 200)
st, js = mgr.call("POST", "/api/admin/residence/allocations", {"contractId": contract.get("id"), "bedId": beds[0], "note": "smoke"}); check("Phân giường cho SV", st, js, (200, 201))
st, js = mgr.call("POST", "/api/admin/residence/allocations", {"contractId": contract.get("id"), "bedId": beds[1]}); check("Phân giường lặp bị chặn -> 409", st, js, 409)
st, js = stu.call("GET", "/api/residence/accommodation/history"); hist = check("SV xem lịch sử lưu trú", st, js, 200)

print("\n=== Hành trình tài chính ===")
st, js = mgr.call("POST", "/api/admin/residence/fee-categories", {"name": "Phí lưu trú " + run, "description": "demo"}); fc = check("Tạo danh mục phí", st, js, (200, 201)) or {}
st, js = mgr.call("POST", "/api/admin/residence/invoices", {"userId": student_id, "contractId": contract.get("id"), "description": "Phí tháng 12", "dueDate": (today + dt.timedelta(days=30)).isoformat(), "lines": [{"feeCategoryId": fc.get("id"), "description": "Tiền phòng", "quantity": 1, "unitPrice": 500000}]}); inv = check("Lập hóa đơn 500.000đ", st, js, (200, 201)) or {}
st, js = stu.call("GET", "/api/residence/invoices"); check("SV xem hóa đơn", st, js, 200)
st, js = stu.call("POST", "/api/residence/payments", {"invoiceId": inv.get("id"), "amount": 600000, "method": "bank_transfer"}); check("Trả vượt dư nợ bị chặn", st, js, (409, 422))
st, js = stu.call("POST", "/api/residence/payments", {"invoiceId": inv.get("id"), "amount": 300000, "method": "bank_transfer", "reference": "CK" + run}); pay = check("SV ghi nhận thanh toán 300.000đ", st, js, (200, 201)) or {}
st, js = stu.call("POST", "/api/residence/payments", {"invoiceId": inv.get("id"), "amount": 250000, "method": "cash"}); check("Khoản chờ giữ chỗ dư nợ (250k > 200k còn lại)", st, js, (409, 422))
st, js = mgr.call("POST", f"/api/admin/residence/payments/{pay.get('id')}/review", {"decision": "confirmed"}); check("QL xác nhận thanh toán", st, js, 200)
st, js = mgr.call("POST", f"/api/admin/residence/payments/{pay.get('id')}/review", {"decision": "confirmed"}); check("Xác nhận lặp bị chặn", st, js, (409, 422))

print("\n=== Hành trình 3: Sửa chữa -> phân loại -> dashboard ===")
st, js = stu.call("POST", "/api/residence/service-requests", {"requestType": "repair", "title": "Ổ cắm có tia lửa", "description": "Ổ cắm cạnh giường bị chập, có tia lửa và mùi khét."}); sr = check("SV gửi yêu cầu sửa chữa", st, js, (200, 201)) or {}
cls = sr.get("classification") or {}
results.append((bool(cls), "Có phân loại cục bộ", json.dumps(cls, ensure_ascii=False)[:160]))
print(("PASS " if results[-1][0] else "FAIL ") + results[-1][1] + "  -> " + results[-1][2])
st, js = stu.call("POST", "/api/residence/assistant/rules", {"question": "Giờ yên tĩnh là mấy giờ?"}); ans = check("Trợ lý nội quy", st, js, 200)
print("     trả lời:", json.dumps(ans, ensure_ascii=False)[:200])
st, js = mgr.call("GET", "/api/residence/service-requests"); check("QL xem hàng đợi yêu cầu", st, js, 200)
st, js = mgr.call("PUT", f"/api/admin/residence/service-requests/{sr.get('id')}", {"status": "in_progress", "staffNote": "Đang xử lý"}); check("QL cập nhật trạng thái yêu cầu", st, js, 200)
st, js = mgr.call("GET", "/api/admin/residence/dashboard"); dash = check("Dashboard vận hành", st, js, 200)
leak = "@example.test" in json.dumps(dash, ensure_ascii=False)
results.append((not leak, "Dashboard không lộ email", "lộ email!" if leak else "ok"))
print(("PASS " if results[-1][0] else "FAIL ") + results[-1][1] + "  -> " + results[-1][2])

print("\n=== Matching baseline trên main ===")
st, js = stu.call("GET", "/api/marketplace/matching/search?q=" + urllib.request.quote("bàn học nhỏ")); check("Tìm kiếm matching (hashing)", st, js, 200)

passed = sum(1 for r in results if r[0])
print(f"\nTỔNG: {passed}/{len(results)} PASS")
