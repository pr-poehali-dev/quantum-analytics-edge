import { Button } from "@/components/ui/button";

type SideTab = "artists" | "create-user" | "label-news" | "site-artists" | "radio" | "news" | "interviews";

interface Artist { id: number; email: string; artist_name: string; created_at: string; is_verified: boolean; }

interface Props {
  sideTab: SideTab;
  setSideTab: (t: SideTab) => void;
  artists: Artist[];
  selectedId: number | null;
  onSelectArtist: (a: Artist) => void;
  onLogout: () => void;
}

export default function AdminSidebar({ sideTab, setSideTab, artists, selectedId, onSelectArtist, onLogout }: Props) {
  return (
    <aside className="w-64 border-r border-white/10 flex flex-col">
      <div className="p-5 border-b border-white/10">
        <a href="/" className="text-lg font-bold tracking-tighter block">Калашников Саунд</a>
        <p className="text-zinc-500 text-xs mt-1">Админ-панель</p>
      </div>

      <div className="flex flex-wrap border-b border-white/10">
        <button
          onClick={() => setSideTab("artists")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "artists" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Артисты
        </button>
        <button
          onClick={() => setSideTab("label-news")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "label-news" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Новинки
        </button>
        <button
          onClick={() => setSideTab("site-artists")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "site-artists" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Главная
        </button>
        <button
          onClick={() => setSideTab("interviews")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "interviews" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Интервью
        </button>
        <button
          onClick={() => setSideTab("radio")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "radio" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Радио
        </button>
        <button
          onClick={() => setSideTab("news")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "news" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          Новости
        </button>
        <button
          onClick={() => setSideTab("create-user")}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${sideTab === "create-user" ? "text-white border-b-2 border-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          + Создать
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sideTab === "artists" && (
          <>
            {artists.length === 0 && <p className="text-zinc-500 text-sm px-2 mt-2">Нет артистов</p>}
            {artists.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelectArtist(a)}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-colors ${selectedId === a.id ? "bg-white text-black" : "text-zinc-300 hover:bg-zinc-900"}`}
              >
                <div className="flex items-center gap-1">
                  <p className="font-medium text-sm">{a.artist_name}</p>
                  {a.is_verified && (
                    <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#1DA1F2] shrink-0">
                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2 6.5L4.5 9L10 3" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${selectedId === a.id ? "text-zinc-600" : "text-zinc-500"}`}>{a.email}</p>
              </button>
            ))}
          </>
        )}
      </div>

      <div className="p-4 border-t border-white/10">
        <Button variant="ghost" size="sm" onClick={onLogout} className="w-full text-zinc-400 hover:text-white">
          Выйти
        </Button>
      </div>
    </aside>
  );
}