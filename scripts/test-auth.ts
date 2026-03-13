/**
 * 認証セキュリティ修正 E2Eテストスクリプト
 *
 * 使い方:
 *   1. npm run dev でローカルサーバーを起動
 *   2. npx tsx scripts/test-auth.ts
 *
 * 前提: EVENT_PIN=1234, ADMIN_PIN=9999
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const EVENT_PIN = "1234";
const ADMIN_PIN = "9999";

// --- Helpers ---

function makeToken(pin: string, guestId?: number | string): string {
  const payload: Record<string, unknown> = { pin };
  if (guestId !== undefined) payload.guestId = guestId;
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

function guestAuth(guestId?: number | string) {
  return { Authorization: `Bearer ${makeToken(EVENT_PIN, guestId)}` };
}

function adminAuth(guestId?: number | string) {
  return { Authorization: `Bearer ${makeToken(ADMIN_PIN, guestId)}` };
}

interface TestResult {
  id: string;
  name: string;
  pass: boolean;
  detail: string;
}

const results: TestResult[] = [];

async function test(
  id: string,
  name: string,
  fn: () => Promise<{ pass: boolean; detail: string }>
) {
  try {
    const { pass, detail } = await fn();
    results.push({ id, name, pass, detail });
    const icon = pass ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
    console.log(`  ${icon} ${id}: ${name}${!pass ? ` — ${detail}` : ""}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ id, name, pass: false, detail: `EXCEPTION: ${msg}` });
    console.log(`  \x1b[31mFAIL\x1b[0m ${id}: ${name} — EXCEPTION: ${msg}`);
  }
}

async function api(
  path: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${BASE_URL}${path}`, options);
  const body = await res.json();
  return { status: res.status, body };
}

// --- State ---

// Use short unique prefix to stay within 20-char nickname limit
const PREFIX = `T${Date.now() % 10000}`;
const INVITEE_NAMES = {
  yamadaTaro: `${PREFIX}山田太郎`,
  yamadaHanako: `${PREFIX}山田花子`,
  satoIchiro: `${PREFIX}佐藤一郎`,
  tanakaMisaki: `${PREFIX}田中美咲`,
  yamadaJiro: `${PREFIX}山田次郎`,
};
const NICK_TARO = `${PREFIX}たろう`;
const NICK_HANA = `${PREFIX}はなちゃん`;

const inviteeIds: Record<string, number> = {};
const guestIds: Record<string, number> = {};

// ============================================================
// Setup: Create invitees via admin API
// ============================================================

async function setup() {
  console.log("\n\x1b[36m=== セットアップ: 招待者投入 ===\x1b[0m\n");
  console.log(`  テストプレフィックス: ${PREFIX}`);

  for (const [key, name] of Object.entries(INVITEE_NAMES)) {
    const { status, body } = await api("/api/invitees", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...adminAuth() },
      body: JSON.stringify({ name }),
    });
    if (status === 201 && body.invitee) {
      const invitee = body.invitee as { id: number; name: string };
      inviteeIds[key] = invitee.id;
      console.log(`  ✓ ${name} → inviteeId: ${invitee.id}`);
    } else {
      console.log(`  ✗ ${name} 投入失敗: ${status} ${JSON.stringify(body)}`);
    }
  }
}

// ============================================================
// Category B: POST /api/guests - recovered path blocked
// ============================================================

async function testCategoryB() {
  console.log("\n\x1b[36m=== カテゴリ B: ゲスト登録 (recovered パス封鎖) ===\x1b[0m\n");

  // B1: Normal registration
  await test("B1", "新規ニックネームで登録 → 201", async () => {
    const { status, body } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: NICK_TARO, inviteeId: inviteeIds["yamadaTaro"] }),
    });
    if (status === 201 && body.guest) {
      guestIds["taro"] = (body.guest as { id: number }).id;
      return { pass: true, detail: "" };
    }
    return { pass: false, detail: `status=${status}, body=${JSON.stringify(body)}` };
  });

  // Register second guest for later tests
  {
    const { status, body } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: NICK_HANA, inviteeId: inviteeIds["yamadaHanako"] }),
    });
    if (status === 201 && body.guest) {
      guestIds["hana"] = (body.guest as { id: number }).id;
      console.log(`  (はなちゃん登録: guestId=${guestIds["hana"]})`);
    }
  }

  // B2: Duplicate nickname → 409 with no guest data
  await test("B2", "既存ニックネームで登録 → 409, guestデータなし", async () => {
    const { status, body } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: NICK_TARO, inviteeId: inviteeIds["satoIchiro"] }),
    });
    const noGuestData = !("guest" in body);
    return {
      pass: status === 409 && noGuestData,
      detail: `status=${status}, hasGuest=${!noGuestData}, body=${JSON.stringify(body)}`,
    };
  });

  // B3: No inviteeId → 400
  await test("B3", "inviteeIdなしで登録 → 400", async () => {
    const { status } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: "新規ユーザー" }),
    });
    return { pass: status === 400, detail: `status=${status}` };
  });

  // B4: Already-registered invitee → 409
  await test("B4", "既登録inviteeで別人が登録 → 409", async () => {
    const { status } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: "別名", inviteeId: inviteeIds["yamadaTaro"] }),
    });
    return { pass: status === 409, detail: `status=${status}` };
  });

  // B5: Non-existent inviteeId → 404
  await test("B5", "存在しないinviteeIdで登録 → 404", async () => {
    const { status } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: "テスト", inviteeId: 99999 }),
    });
    return { pass: status === 404, detail: `status=${status}` };
  });

  // B6: 21-char nickname → 400
  await test("B6", "21文字ニックネーム → 400", async () => {
    const { status } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: "あ".repeat(21), inviteeId: inviteeIds["satoIchiro"] }),
    });
    return { pass: status === 400, detail: `status=${status}` };
  });

  // B7: Empty nickname → 400
  await test("B7", "空文字ニックネーム → 400", async () => {
    const { status } = await api("/api/guests", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: "", inviteeId: inviteeIds["satoIchiro"] }),
    });
    return { pass: status === 400, detail: `status=${status}` };
  });
}

// ============================================================
// Category A: guestId forgery prevention
// ============================================================

async function testCategoryA() {
  console.log("\n\x1b[36m=== カテゴリ A: guestId 偽装防止 ===\x1b[0m\n");

  const uploadBody = JSON.stringify({ sceneId: 1, contentType: "image/jpeg" });

  // A1: Valid guestId → 200
  await test("A1", "正規guestIdでupload → 200", async () => {
    const { status } = await api("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth(guestIds["taro"]) },
      body: uploadBody,
    });
    return { pass: status === 200, detail: `status=${status}` };
  });

  // A2: Non-existent guestId → should fail (500 or 400 because guestId becomes undefined)
  await test("A2", "存在しないguestId → エラー", async () => {
    const { status } = await api("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth(99999) },
      body: uploadBody,
    });
    return { pass: status !== 200, detail: `status=${status}` };
  });

  // A3: guestId=0 → should fail
  await test("A3", "guestId=0 → エラー", async () => {
    const { status } = await api("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth(0) },
      body: uploadBody,
    });
    return { pass: status !== 200, detail: `status=${status}` };
  });

  // A4: guestId=string → should fail
  await test("A4", "guestId=文字列 → エラー", async () => {
    const { status } = await api("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth("abc") },
      body: uploadBody,
    });
    return { pass: status !== 200, detail: `status=${status}` };
  });

  // A5: guestId omitted → should fail
  await test("A5", "guestId省略 → エラー", async () => {
    const { status } = await api("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: uploadBody,
    });
    return { pass: status !== 200, detail: `status=${status}` };
  });

  // A6: Another user's guestId → succeeds (auth passes, just wrong attribution)
  await test("A6", "他人のguestIdでupload → 200 (認証は通る)", async () => {
    const { status } = await api("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth(guestIds["hana"]) },
      body: uploadBody,
    });
    return { pass: status === 200, detail: `status=${status}` };
  });
}

// ============================================================
// Category C: Verify API (re-login)
// ============================================================

async function testCategoryC() {
  console.log("\n\x1b[36m=== カテゴリ C: 再ログイン verify API ===\x1b[0m\n");

  // C1: Correct nickname + inviteeId → 200
  await test("C1", "正しいnickname+inviteeId → 200", async () => {
    const { status, body } = await api("/api/guests/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: NICK_TARO, inviteeId: inviteeIds["yamadaTaro"] }),
    });
    const hasGuest = "guest" in body;
    return { pass: status === 200 && hasGuest, detail: `status=${status}, hasGuest=${hasGuest}` };
  });

  // C2: Wrong nickname → 401
  await test("C2", "間違ったnickname → 401", async () => {
    const { status } = await api("/api/guests/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: "にせもの", inviteeId: inviteeIds["yamadaTaro"] }),
    });
    return { pass: status === 401, detail: `status=${status}` };
  });

  // C3: Correct nickname but wrong inviteeId → 401
  await test("C3", "正しいnicknameだが別のinviteeId → 401", async () => {
    const { status } = await api("/api/guests/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: NICK_TARO, inviteeId: inviteeIds["yamadaHanako"] }),
    });
    return { pass: status === 401, detail: `status=${status}` };
  });

  // C4: Empty nickname → 400
  await test("C4", "nickname空文字 → 400", async () => {
    const { status } = await api("/api/guests/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: "", inviteeId: inviteeIds["yamadaTaro"] }),
    });
    return { pass: status === 400, detail: `status=${status}` };
  });

  // C5: Missing inviteeId → 400
  await test("C5", "inviteeId省略 → 400", async () => {
    const { status } = await api("/api/guests/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: NICK_TARO }),
    });
    return { pass: status === 400, detail: `status=${status}` };
  });

  // C6: Non-existent inviteeId → 401
  await test("C6", "存在しないinviteeId → 401", async () => {
    const { status } = await api("/api/guests/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ nickname: NICK_TARO, inviteeId: 99999 }),
    });
    return { pass: status === 401, detail: `status=${status}` };
  });

  // C7: No auth header → 401
  await test("C7", "認証なしでverify → 401", async () => {
    const { status } = await api("/api/guests/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: NICK_TARO, inviteeId: inviteeIds["yamadaTaro"] }),
    });
    return { pass: status === 401, detail: `status=${status}` };
  });
}

// ============================================================
// Category D: Invitee search filter
// ============================================================

async function testCategoryD() {
  console.log("\n\x1b[36m=== カテゴリ D: 招待者検索フィルタ ===\x1b[0m\n");

  // Use PREFIX to search only our test data
  const searchPrefix = PREFIX + "山田";

  // D1: Default (unregistered only) search for PREFIX+"山田"
  await test("D1", "初回登録用検索 → 未登録の次郎のみ", async () => {
    const { status, body } = await api(
      `/api/invitees/search?q=${encodeURIComponent(searchPrefix)}`,
      { headers: guestAuth() }
    );
    const invitees = body.invitees as { id: number; name: string }[];
    const names = invitees.map((i) => i.name);
    const pass =
      status === 200 &&
      names.includes(INVITEE_NAMES.yamadaJiro) &&
      !names.includes(INVITEE_NAMES.yamadaTaro) &&
      !names.includes(INVITEE_NAMES.yamadaHanako);
    return { pass, detail: `status=${status}, names=${JSON.stringify(names)}` };
  });

  // D2: registeredOnly=true
  await test("D2", "再ログイン用検索 → 登録済みの太郎・花子のみ", async () => {
    const { status, body } = await api(
      `/api/invitees/search?q=${encodeURIComponent(searchPrefix)}&registeredOnly=true`,
      { headers: guestAuth() }
    );
    const invitees = body.invitees as { id: number; name: string }[];
    const names = invitees.map((i) => i.name);
    const pass =
      status === 200 &&
      names.includes(INVITEE_NAMES.yamadaTaro) &&
      names.includes(INVITEE_NAMES.yamadaHanako) &&
      !names.includes(INVITEE_NAMES.yamadaJiro);
    return { pass, detail: `status=${status}, names=${JSON.stringify(names)}` };
  });

  // D3: No match
  await test("D3", "該当なし検索 → 空配列", async () => {
    const { status, body } = await api(
      `/api/invitees/search?q=${encodeURIComponent(PREFIX + "存在しない名前")}`,
      { headers: guestAuth() }
    );
    const invitees = body.invitees as unknown[];
    return { pass: status === 200 && invitees.length === 0, detail: `count=${invitees.length}` };
  });

  // D4: Empty query
  await test("D4", "空クエリ → 空配列", async () => {
    const { status, body } = await api("/api/invitees/search?q=", { headers: guestAuth() });
    const invitees = body.invitees as unknown[];
    return { pass: status === 200 && invitees.length === 0, detail: `count=${invitees.length}` };
  });

  // D5: Partial match with PREFIX+"田" → only 田中美咲 matches (山田* don't contain PREFIX+"田")
  await test("D5", "部分一致（デフォルト） → 未登録の田中美咲のみ", async () => {
    const { status, body } = await api(
      `/api/invitees/search?q=${encodeURIComponent(PREFIX + "田")}`,
      { headers: guestAuth() }
    );
    const invitees = body.invitees as { name: string }[];
    const names = invitees.map((i) => i.name);
    const pass =
      status === 200 &&
      names.length === 1 &&
      names.includes(INVITEE_NAMES.tanakaMisaki);
    return { pass, detail: `names=${JSON.stringify(names)}` };
  });
}

// ============================================================
// Category E: Admin permission checks
// ============================================================

async function testCategoryE() {
  console.log("\n\x1b[36m=== カテゴリ E: 管理者API権限チェック ===\x1b[0m\n");

  // E1: Guest PIN → invitee list → 403
  await test("E1", "ゲストPINでinvitee一覧 → 403", async () => {
    const { status } = await api("/api/invitees", { headers: guestAuth() });
    return { pass: status === 403, detail: `status=${status}` };
  });

  // E2: Admin PIN → invitee list → 200
  await test("E2", "管理者PINでinvitee一覧 → 200", async () => {
    const { status } = await api("/api/invitees", { headers: adminAuth() });
    return { pass: status === 200, detail: `status=${status}` };
  });

  // E3: Guest PIN → create invitee → 403
  await test("E3", "ゲストPINでinvitee作成 → 403", async () => {
    const { status } = await api("/api/invitees", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...guestAuth() },
      body: JSON.stringify({ name: "不正作成" }),
    });
    return { pass: status === 403, detail: `status=${status}` };
  });

  // E4: Valid PIN auth
  await test("E4", "正しいPINで認証 → 200", async () => {
    const { status } = await api("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: EVENT_PIN }),
    });
    return { pass: status === 200, detail: `status=${status}` };
  });

  // E5: Invalid PIN auth
  await test("E5", "不正PINで認証 → 401", async () => {
    const { status } = await api("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: "0000" }),
    });
    return { pass: status === 401, detail: `status=${status}` };
  });
}

// ============================================================
// Cleanup
// ============================================================

async function cleanup() {
  console.log("\n\x1b[36m=== クリーンアップ ===\x1b[0m\n");

  // Delete guests first (FK constraint)
  for (const [nickname, guestId] of Object.entries(guestIds)) {
    const { status } = await api(`/api/admin/guests/${guestId}`, {
      method: "DELETE",
      headers: adminAuth(),
    });
    console.log(`  guest "${nickname}" (id=${guestId}): ${status === 200 ? "削除" : `失敗(${status})`}`);
  }

  // Delete invitees
  for (const [name, inviteeId] of Object.entries(inviteeIds)) {
    const { status } = await api(`/api/invitees/${inviteeId}`, {
      method: "DELETE",
      headers: adminAuth(),
    });
    console.log(`  invitee "${name}" (id=${inviteeId}): ${status === 200 ? "削除" : `失敗(${status})`}`);
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  console.log("\x1b[1m\n╔══════════════════════════════════════╗");
  console.log("║  認証セキュリティ E2E テスト         ║");
  console.log("╚══════════════════════════════════════╝\x1b[0m");
  console.log(`\nBase URL: ${BASE_URL}`);

  // Verify server is running
  try {
    await fetch(`${BASE_URL}/api/auth`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: "test" }) });
  } catch {
    console.error("\n\x1b[31mエラー: サーバーに接続できません。npm run dev を実行してください。\x1b[0m\n");
    process.exit(1);
  }

  await setup();
  await testCategoryB();
  await testCategoryA();
  await testCategoryC();
  await testCategoryD();
  await testCategoryE();
  await cleanup();

  // Summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  const total = results.length;

  console.log("\n\x1b[1m=== テスト結果サマリー ===\x1b[0m\n");
  console.log(`  合計: ${total}  \x1b[32mPASS: ${passed}\x1b[0m  \x1b[31mFAIL: ${failed}\x1b[0m\n`);

  if (failed > 0) {
    console.log("  \x1b[31m失敗したテスト:\x1b[0m");
    for (const r of results.filter((r) => !r.pass)) {
      console.log(`    ${r.id}: ${r.name} — ${r.detail}`);
    }
    console.log();
    process.exit(1);
  } else {
    console.log("  \x1b[32m全テスト PASS!\x1b[0m\n");
  }
}

main();
