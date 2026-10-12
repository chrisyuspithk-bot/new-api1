# B2B2C Phase 1 — 老闆需求對照 QA 報告（new-api1）

| 項目 | 內容 |
|------|------|
| 產品／分支 | `new-api1` / `main`（**無** `feat/b2b2c-phase1` 分支） |
| 程式碼 SHA | `1026a1499` |
| 遠端 | `github.com/chrisyuspithk-bot/new-api1` |
| 對照基準 | `new-api3` / `feat/b2b2c-phase1`（見 `/workspace/b2b2c-boss-qa/REPORT-boss.md`，24 Pass／0 Fail） |
| 測試類型 | API 自動化＋Playwright UI 截圖（對照老闆需求 zh-Hant） |
| 測試日期 | 2026-10-12 21:40 HKT |
| 測試人員 | Grok Bot QA（executor） |
| 報告路徑 | `/workspace/new-api1-boss-qa/REPORT.md`／`.pdf` |
| 截圖目錄 | `/workspace/new-api1-boss-qa/screenshots/` |
| 運行驗證 | **可運行**：`go build` → `/tmp/new-api1-boss`；SQLite；`http://127.0.0.1:3311`；web `bun run build` 已嵌入 |

---

## 1. 老闆需求對照範圍

### Admin
- 新增多個代理商（Reseller）；編輯名稱／聯絡
- 模型＋每模型費率（成本價）
- 代理商列表；付款／帳本歷史
- 既有支付方式自助儲值；Admin 手動入帳
- Admin→Reseller 成本層

### Reseller
- 新增多個客戶；編輯名稱／聯絡
- 模型＋加價；客戶列表；付款歷史
- 客戶自助儲值；Reseller 手動入帳
- Reseller→Customer 加價；客戶端顯示所屬代理商

### 系統
- 雙腿扣款（dual deduct）；庫存入帳（stock credit）
- 公開／OAuth 註冊關閉
- 月結發票：Admin／Reseller／Customer（對照 new-api3 一併檢查）

**不在範圍**：真實支付閘道 E2E；上游真實模型品質。

---

## 2. 測試環境

| 項目 | 值 |
|------|-----|
| OS | Linux（box，Asia/Hong_Kong） |
| Backend | `/tmp/new-api1-boss`（embed `web/dist`） |
| DB | SQLite `/tmp/new-api1-boss.db` |
| URL | `http://127.0.0.1:3311` |
| Redis | 未啟用 |
| 帳號 | `admin`（root）／`reseller1`・`reseller2`／`cust1`・`cust1b`・`cust2` |
| Mock upstream | `http://127.0.0.1:18080`（OpenAI chat completions） |

### new-api1 B2B2C API 表面（實際）

掛在 **`/api/user/...`**（非 `/api/admin`）：

- `GET/POST /api/user/resellers`
- `GET /api/user/resellers/:id`
- `POST /api/user/resellers/:id/topup`（`amount_usd`）
- `PUT /api/user/resellers/:id/discount`
- `GET /api/user/resellers/:id/customers`
- `PUT /api/user/customers/:id/reseller`
- `PUT /api/user/customers/:id/markup`

`RoleResellerUser = 2`（new-api3 為 `5`）。**無** `/api/reseller/*` 代理商自助控制台。

---

## 3. 功能用例表（老闆需求）

| 編號 | 需求對照 | 步驟 | 期望 | 實際 | 結果 | 截圖 |
|------|----------|------|------|------|------|------|
| TC-A01 | Admin: 新增多個 Reseller | Root POST /api/user/resellers（既有 reseller1/2 + 新建） | 可連續建立多個代理商，回傳 id | HTTP200 success=True msg='Reseller created' data={"id": 7}; list_total=3 | **Pass** | `screenshots/TC-A01-admin-add-reseller.png` |
| TC-A02 | Admin: 名稱／聯絡 | PUT /api/user/resellers/:id（品牌／聯絡）與 PUT /api/user/ 更新 display_name | 可更新 display_name／brand／聯絡資訊 | put_reseller=HTTP404 success=None msg='Invalid URL (PUT /api/user/resellers/2)' data=; put_user=HTTP200 success=True msg | **Fail** | `screenshots/TC-A02-admin-reseller-detail.png` |
| TC-A03 | Admin: 模型＋每模型費率 | PUT …/model_prices（期望）；實際僅有 PUT …/discount 全域乘數 | 可覆寫每模型成本價並列表 | model_prices=HTTP404 success=None msg='Invalid URL (PUT /api/user/resellers/2/model_prices)' data=; discount=HTTP200 suc | **Fail** | `screenshots/TC-A03-admin-discount.png` |
| TC-A04 | Admin: Reseller 列表 | GET /api/user/resellers | 回傳多筆代理商（至少 2） | HTTP200 success=True msg='' data={"page": 1, "page_size": 50, "total": 3, "items": [{"id": 7, "username": "rsb12075", "p | **Pass** | `screenshots/TC-A04-admin-resellers-list.png` |
| TC-A05 | Admin: 付款歷史 | GET /api/user/resellers/2/ledger | 可讀取 ledger | HTTP404 success=None msg='Invalid URL (GET /api/user/resellers/2/ledger)' data= | **Fail** | `screenshots/TC-A02-admin-reseller-detail.png` |
| TC-A06 | Admin/Reseller: 既有方式自付 | Reseller GET /api/user/topup/info | topup info 可讀 | Fresh reseller login: GET /api/user/topup/info HTTP200 success (prior Fail=session invalidated by admin UpdateUser) | **Pass** | `screenshots/TC-A06-reseller-wallet.png` |
| TC-A07 | Admin: 手動 credit | POST /api/user/resellers/2/topup amount_usd=1.0 | reseller_cost_balance 增加（約 +500000） | credit=HTTP200 success=True msg='Top-up successful' data={"quota": 500000}; before=0; after=500000; delta=500000 | **Pass** | `screenshots/TC-A02-admin-reseller-detail.png` |
| TC-A08 | Admin: markup Admin→Reseller | PUT /api/user/resellers/:id/discount | 可設定並讀回成本乘數 | put=HTTP200 success=True msg='Reseller discount updated' data={"discount": 0.88}; discount=0.88 | **Pass** | `screenshots/TC-A03-admin-discount.png` |
| TC-R01 | Reseller: 新增多個 Customer | POST /api/reseller/customers ×2 | Reseller 自身可連續建立客戶 | cA=HTTP404 success=None msg='Invalid URL (POST /api/reseller/customers)' data=; cB=HTTP404 success=None msg='Invalid URL | **Fail** | `screenshots/TC-R04-reseller-customers.png` |
| TC-R02 | Reseller: 名稱／聯絡 | PUT /api/reseller/customers/4 | Reseller 可更新客戶 display_name | HTTP404 success=None msg='Invalid URL (PUT /api/reseller/customers/4)' data= | **Fail** | `screenshots/TC-R02-customer-detail.png` |
| TC-R03 | Reseller: 模型＋加價 | PUT /api/reseller/model_markups | 可設定 per-model markup | HTTP404 success=None msg='Invalid URL (PUT /api/reseller/model_markups)' data= | **Fail** | `screenshots/TC-R03-reseller-markups.png` |
| TC-R04 | Reseller: Customer 列表 | GET /api/reseller/customers | Reseller 可列表自身多筆客戶 | HTTP404 success=None msg='Invalid URL (GET /api/reseller/customers)' data=; total≈0 | **Fail** | `screenshots/TC-R04-reseller-customers.png` |
| TC-R05 | Reseller: 付款歷史 | GET /api/reseller/ledger | 可讀取自身 ledger | HTTP404 success=None msg='Invalid URL (GET /api/reseller/ledger)' data= | **Fail** | `screenshots/TC-R-reseller-console.png` |
| TC-R06 | Reseller/Customer: 客戶自付 | Customer GET /api/user/topup/info | topup info 200 | HTTP200 success=True msg='' data={"amount_options": [10, 20, 50, 100, 200, 500], "creem_products": "[]", "discount": {}, | **Pass** | `screenshots/TC-R06-cust-wallet.png` |
| TC-R07 | Reseller: 手動 credit | POST /api/reseller/customers/4/credit | 客戶 quota 增加 | credit=HTTP404 success=None msg='Invalid URL (POST /api/reseller/customers/4/credit)' data=; before=2000000; after=20000 | **Fail** | `screenshots/TC-R02-customer-detail.png` |
| TC-R08 | Reseller: markup Reseller→Customer | PUT /api/reseller/customers/:id/model_markups（Reseller 自主） | Reseller 可設定客戶級加價 | reseller=HTTP404 success=None msg='Invalid URL (PUT /api/reseller/customers/4/model_markups)' data=; admin_only_fallback | **Fail** | `screenshots/TC-R02-customer-detail.png` |
| TC-R09 | Reseller: 客戶 UI 顯示代理商 | Customer GET /api/user/self → reseller 區塊 | 可見代理商顯示名稱；不洩漏成本／markup | reseller={}; reseller_id_field=None; leaked=False | **Fail** | `screenshots/TC-R09-cust-profile-reseller.png` |
| TC-S01 | 系統: dual deduct | model 單元測試 + 可選 mock relay；檢查 logs.reseller_cost_quota | 雙腿預扣／扣款機制可用 | unit_ok=True; live after ModelPrice=0.1: customer_quota -50000, reseller_cost_balance -40000 (0.8*50000); log quota=5000 | **Pass** | `screenshots/TC-S01-dual.png` |
| TC-S02 | 系統: stock credit | Admin topup 後 reseller_cost_balance 上升 | 庫存入帳成功 | topup=HTTP200 success=True msg='Top-up successful' data={"quota": 1000000}; bal=6500000 | **Pass** | `screenshots/TC-A02-admin-reseller-detail.png` |
| TC-S03 | 系統: register/OAuth off | GET /api/status；POST /api/user/register | register 關閉且註冊失敗 | reg=False pw=False; register=HTTP200 success=False msg='New user registration has been disabled by administrator' data= | **Pass** | `screenshots/TC-S03-sign-in-no-register.png` |
| TC-S04 | 系統: 月結發票 Admin | /api/admin/invoices/generate | 可產生／列表發票 | HTTP404 success=None msg='Invalid URL (GET /api/admin/invoices)' data= | **Fail** | `screenshots/TC-S04.png` |
| TC-S05 | 系統: 月結發票 Reseller | /api/reseller/invoices | 可產生／列表發票 | HTTP404 success=None msg='Invalid URL (GET /api/reseller/invoices)' data= | **Fail** | `screenshots/TC-S05.png` |
| TC-S06 | 系統: 月結發票 Customer | /api/user/invoices | 可產生／列表發票 | HTTP403 success=False msg='Unauthorized, insufficient privileges' data= | **Fail** | `screenshots/TC-S06.png` |
| TC-X01 | 系統: 隔離 | rid1 客戶列表不含 cust2 | 不可見他牌客戶 | has_cid2=False; has_cid1=True; cross=HTTP404 success=None msg='Invalid URL (GET /api/reseller/customers/6)' data=; admin | **Pass** | `screenshots/TC-R04-reseller-customers.png` |

### 結果匯總（功能 API）

| Pass | Fail | Blocked |
|------|------|---------|
| 10 | 14 | 0 |

---

## 4. UI 截圖驗證

| 編號 | 標題 | 路徑 | 結果 | 截圖 |
|------|------|------|------|------|
| UI-S03a | 登入頁無註冊入口 | `/sign-in` | **Pass** | `TC-S03-sign-in-no-register.png` |
| UI-S03b | 註冊深鏈導向／關閉 | `http://127.0.0.1:3311/sign-up` | **Pass** | `TC-S03-sign-up-redirect.png` |
| UI-A04 | Admin 代理商列表 | `/resellers` | **Pass** | `TC-A04-admin-resellers-list.png` |
| UI-A01 | Admin 新增代理商 UI | `/resellers` | **Pass** | `TC-A01-admin-add-reseller.png` |
| UI-A02 | Admin 代理商操作（topup/discount/customers dialogs） | `/resellers` | **Pass** | `TC-A02-admin-reseller-detail.png` |
| UI-A03 | Admin 折扣／成本乘數 dialog | `/resellers` | **Pass** | `TC-A03-admin-discount.png` |
| UI-R04 | Admin 檢視代理商客戶列表 dialog | `/resellers` | **Pass** | `TC-R04-reseller-customers.png` |
| UI-S04 | Admin 月結發票頁 | `http://127.0.0.1:3311/invoices` | **Fail** | `TC-S04.png` |
| UI-A06 | Reseller 錢包／儲值 | `/wallet` | **Pass** | `TC-A06-reseller-wallet.png` |
| UI-R-console | Reseller 控制台路由 | `http://127.0.0.1:3311/reseller` | **Pass** | `TC-R-reseller-console.png` |
| UI-R-admin-only | Reseller 開 /resellers（應無權或空） | `http://127.0.0.1:3311/403` | **Pass** | `TC-R03-reseller-markups.png` |
| UI-R06 | 客戶錢包 | `/wallet` | **Pass** | `TC-R06-cust-wallet.png` |
| UI-R09 | 客戶端顯示所屬代理商 | `http://127.0.0.1:3311/profile` | **Fail** | `TC-R09-cust-profile-reseller.png` |
| UI-S06 | 客戶發票頁 | `http://127.0.0.1:3311/invoices` | **Fail** | `TC-S06.png` |

### UI 匯總

| Pass | Fail |
|------|------|
| 11 | 3 |

---

## 5. 關鍵缺口 vs new-api3（feat/b2b2c-phase1）

| 能力 | new-api1（本倉 main） | new-api3（phase1） |
|------|----------------------|---------------------|
| 角色值 | `RoleResellerUser=2` | `RoleResellerUser=5` |
| Admin API 前綴 | `/api/user/resellers` | `/api/admin/resellers` |
| Reseller 自助 API | **無** `/api/reseller/*` | 完整 CRUD／credit／markups／ledger／logs／reports |
| 每模型成本價 | **無**（僅全域 `reseller_discount`） | `reseller_model_prices` |
| 每模型／客戶 markup | **無** Reseller 端；Admin 僅全域 `customer_markup` | `reseller_model_markups` + `customer_model_markups` |
| 帳本 ledger | **無** | `reseller_ledger` + 審計種類 |
| 品牌／聯絡 profile | **無**（無 `reseller_profiles`／brand） | 有 profile／brand；客戶可見顯示名 |
| 客戶端顯示代理商 | **Fail**（`/api/user/self` 無 `reseller` 區塊） | `reseller_display_name` 等安全欄位 |
| 雙腿扣款 | **有**（`TryReserveResellerCost` + live 驗證 cost_quota） | 有（更完整含 task／MJ／WSS） |
| 庫存 topup | **有**（Admin `…/topup`） | `…/credit|debit`（quota／money_usd） |
| 註冊關閉 | **有**（選項可關；setup 未預設關） | setup 預設關 + 選項 |
| 月結發票 | **無** | Admin／Reseller／Customer 發票 API+UI |
| 群組白名單 | **無** `reseller_groups` | 有 |
| Admin UI | `/resellers` 列表＋dialog（topup／discount／customers） | 詳情頁 tabs：overview／groups／prices／ledger |
| Reseller UI 控制台 | **無** | `/reseller/*` 完整控制台 |
| 隔離 | Admin 按 reseller 列客戶可隔離；Reseller 無自助 API | Reseller API 404 跨租戶 |

---

## 6. 運行結論

1. **可運行**：Go build 成功；內嵌前端；SQLite 遷移正常；HTTP 3311 服務正常。
2. **老闆需求符合度**：API **10 Pass／14 Fail**（同表 24 項對照 new-api3 的 24 Pass）。
3. **已落地可用**：多 Reseller 建立、列表、全域 discount、Admin topup 庫存、雙腿扣款（含 live mock：`quota=50000`／`reseller_cost_quota=40000`）、註冊關閉、客戶隔離（Admin 視角）、基礎 Admin Resellers UI。
4. **主要缺口**：Reseller 自助體系整段缺失、每模型費率／加價、ledger、發票、客戶端代理商展示、名稱／品牌聯絡專用 API。相對 new-api3 仍屬 **早期／精簡 B2B2C 骨架**，非完整 Phase 1。

---

## 7. 建議（給老闆／產品）

- 若要以 new-api3 Phase 1 為準交付：優先移植 `/api/reseller/*`、ledger、per-model prices／markups、`self.reseller` 展示、發票。
- 或在 new-api1 補齊同等表面後再回歸本報告用例表至 24 Pass。
