// 영수증 1장 분석에 드는 토큰·비용을 설정별로 측정한다. 사용: npm run gemini:measure [이미지경로]
// 프롬프트·스키마는 src/app/api/analyze/route.ts와 같은 내용을 사용한다.
import { readFileSync } from "node:fs";
import { GoogleGenAI, MediaResolution, ThinkingLevel } from "@google/genai";

const MODEL = "gemini-3.5-flash-lite";
const PRICE = { input: 0.3, output: 2.5 }; // USD / 1M tokens (Standard, 2026-11 기준 공식 가격표)
const KRW_PER_USD = 1400; // 대략적인 환율

const CATEGORIES = ["식비", "카페/간식", "교통", "쇼핑", "생활용품", "의료/건강", "문화/여가", "기타"];
const schema = {
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
          category: { type: "string", enum: CATEGORIES },
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

const imagePath = process.argv[2] ?? "receipt.jpg";
const data = readFileSync(imagePath).toString("base64");
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CONFIGS = [
  { label: "기본 해상도", config: {} },
  { label: "해상도 HIGH", config: { mediaResolution: MediaResolution.MEDIA_RESOLUTION_HIGH } },
  { label: "해상도 MEDIUM (앱 설정)", config: { mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM } },
  { label: "해상도 LOW", config: { mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW } },
  {
    label: "MEDIUM + 생각 최소",
    config: {
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  },
];

const rows = [];
for (const { label, config } of CONFIGS) {
  const t0 = Date.now();
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ inlineData: { mimeType: "image/jpeg", data } }, { text: PROMPT }],
      config: { responseMimeType: "application/json", responseJsonSchema: schema, ...config },
    });
    const u = res.usageMetadata ?? {};
    const image = u.promptTokensDetails?.find((d) => d.modality === "IMAGE")?.tokenCount ?? 0;
    const input = u.promptTokenCount ?? 0;
    const output = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
    const usd = (input * PRICE.input + output * PRICE.output) / 1e6;
    const r = JSON.parse(res.text ?? "{}");
    rows.push({
      설정: label,
      이미지토큰: image,
      입력토큰: input,
      출력토큰: u.candidatesTokenCount ?? 0,
      생각토큰: u.thoughtsTokenCount ?? 0,
      "1장 비용(원)": +(usd * KRW_PER_USD).toFixed(3),
      "1000장(원)": Math.round(usd * KRW_PER_USD * 1000),
      "응답(초)": +((Date.now() - t0) / 1000).toFixed(1),
      인식결과: `${r.store} / ${r.date} / ${r.total}원 / ${(r.items ?? []).map((i) => `${i.name}:${i.category}`).join(",")}`,
    });
  } catch (e) {
    rows.push({ 설정: label, 오류: String(e.message ?? e).slice(0, 120) });
  }
}
console.table(rows);
