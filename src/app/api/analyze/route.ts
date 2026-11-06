import { GoogleGenAI, MediaResolution } from "@google/genai";
import { getRequestSession, unauthorized } from "@/lib/auth";
import { createExpense } from "@/lib/db";
import { CATEGORIES, type ReceiptAnalysis } from "@/lib/types";
import { normalizeExpense } from "@/lib/validate";

const MODEL = "gemini-3.5-flash-lite";
const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const responseJsonSchema = {
  type: "object",
  properties: {
    store: { type: "string", description: "상호명. 알 수 없으면 빈 문자열" },
    date: { type: "string", description: "결제일 YYYY-MM-DD. 알 수 없으면 빈 문자열" },
    total: { type: "number", description: "총 결제 금액(원)" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "number" },
          price: { type: "number", description: "해당 항목의 합계 금액(원)" },
          category: { type: "string", enum: [...CATEGORIES] },
        },
        required: ["name", "quantity", "price", "category"],
      },
    },
  },
  required: ["store", "date", "total", "items"],
};

const PROMPT = `너는 한국어 가계부 도우미야. 첨부된 영수증 이미지를 분석해서 JSON으로 반환해.
- store: 상호명
- date: 결제일 (YYYY-MM-DD)
- total: 총 결제 금액 (숫자, 원 단위)
- items: 구매 항목 목록. 각 항목은 name, quantity, price(해당 줄의 합계 금액), category
- category는 반드시 다음 중 하나: ${CATEGORIES.join(", ")}
영수증이 아니거나 읽을 수 없으면 items를 빈 배열로, total을 0으로 반환해.`;

export async function POST(request: Request) {
  if (!(await getRequestSession(request))) return unauthorized();
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요." },
      { status: 500 },
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!file) return Response.json({ error: "이미지 파일이 없습니다." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) {
    return Response.json({ error: "JPG, PNG, WEBP, HEIC 이미지만 지원합니다." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "이미지는 4MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  let analysis: ReceiptAnalysis | null = null;
  try {
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ inlineData: { mimeType: file.type, data } }, { text: PROMPT }],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema,
        // 이미지 토큰 1,064 → 540 (영수증 1장 비용 약 25% 절감). 측정: npm run gemini:measure
        mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      },
    });

    const parsed = JSON.parse(response.text ?? "{}") as Record<string, unknown>;
    // 날짜를 못 읽었거나 잘못 읽었으면 오늘(KST) 날짜로 대체
    const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
    analysis = normalizeExpense(parsed) ?? normalizeExpense({ ...parsed, date: today });
  } catch (err) {
    console.error("[analyze] Gemini error:", err);
    return Response.json(
      { error: "이미지 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." },
      { status: 502 },
    );
  }

  if (!analysis) {
    return Response.json(
      { error: "영수증에서 항목을 찾지 못했습니다. 더 선명한 사진으로 다시 시도해주세요." },
      { status: 422 },
    );
  }

  try {
    return Response.json(await createExpense(analysis), { status: 201 });
  } catch (err) {
    console.error("[analyze] DB error:", err);
    return Response.json(
      { error: "분석은 완료했지만 저장에 실패했습니다. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }
}
