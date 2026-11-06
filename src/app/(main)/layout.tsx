import Link from "next/link";
import TabNav from "@/components/TabNav";
import UserMenu from "@/components/UserMenu";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      {/* 상단 바: 휴대폰은 2줄(제목+메뉴 / 탭), 태블릿 이상은 한 줄(제목 · 탭 · 메뉴) */}
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="order-1 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm text-white">
              ₩
            </span>
            <span className="text-xl font-bold tracking-tight text-gray-900">AI가계부</span>
          </Link>
          <div className="order-2 ml-auto md:order-3">
            <UserMenu />
          </div>
          <div className="order-3 w-full md:order-2 md:w-auto">
            <TabNav />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}
