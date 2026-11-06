export const CATEGORIES = [
  "식비",
  "카페/간식",
  "교통",
  "쇼핑",
  "생활용품",
  "의료/건강",
  "문화/여가",
  "기타",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface ExpenseItem {
  name: string;
  quantity: number;
  price: number;
  category: Category;
}

export interface ReceiptAnalysis {
  store: string;
  date: string; // YYYY-MM-DD
  total: number;
  items: ExpenseItem[];
}

export interface Expense extends ReceiptAnalysis {
  id: string;
  createdAt: number;
}

/** color: 차트·프로그레스바용 색 (Tailwind 500 계열) */
export const CATEGORY_STYLES: Record<Category, { emoji: string; badge: string; color: string }> = {
  식비: { emoji: "🍚", badge: "bg-orange-50 text-orange-700 ring-orange-200", color: "#f97316" },
  "카페/간식": { emoji: "☕", badge: "bg-amber-50 text-amber-700 ring-amber-200", color: "#f59e0b" },
  교통: { emoji: "🚌", badge: "bg-sky-50 text-sky-700 ring-sky-200", color: "#0ea5e9" },
  쇼핑: { emoji: "🛍️", badge: "bg-pink-50 text-pink-700 ring-pink-200", color: "#ec4899" },
  생활용품: { emoji: "🧴", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", color: "#10b981" },
  "의료/건강": { emoji: "💊", badge: "bg-red-50 text-red-700 ring-red-200", color: "#ef4444" },
  "문화/여가": { emoji: "🎬", badge: "bg-violet-50 text-violet-700 ring-violet-200", color: "#8b5cf6" },
  기타: { emoji: "📦", badge: "bg-gray-50 text-gray-700 ring-gray-200", color: "#9ca3af" },
};
