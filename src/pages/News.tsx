import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Header from "@/components/landing/Header";
import Footer from "@/components/landing/Footer";

interface NewsItem {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  published_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" });
}

export default function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    api.news.list(50).then(r => { setNews(r.news || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-3">Новости</h1>
          <p className="text-zinc-400">Последние события Калашников Саунд</p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!loading && news.length === 0 && (
          <div className="text-center py-20 text-zinc-500">Новостей пока нет</div>
        )}

        <div className="space-y-6">
          {news.map(item => (
            <article key={item.id} className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-colors">
              {item.image_url && (
                <div className="h-56 md:h-72 overflow-hidden">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <p className="text-white/40 text-xs mb-2">{formatDate(item.published_at)}</p>
                <h2 className="text-white font-bold text-xl mb-3 leading-tight">{item.title}</h2>
                <div className={`text-zinc-400 text-sm leading-relaxed ${expanded === item.id ? "" : "line-clamp-4"}`}>
                  {item.body.split("\n").map((line, i) => (
                    <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>
                  ))}
                </div>
                {item.body.length > 300 && (
                  <button
                    onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                    className="mt-3 text-white/50 hover:text-white text-xs transition-colors"
                  >
                    {expanded === item.id ? "Свернуть" : "Читать полностью"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
