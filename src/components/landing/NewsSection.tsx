import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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

const NewsSection = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.news.list(4).then(r => { setNews(r.news || []); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  if (!loaded || news.length === 0) return null;

  const [main, ...rest] = news;

  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-semibold text-white/70 tracking-wide uppercase">
            Лейбл в деталях
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            <span className="gradient-text">Новости</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">Последние события лейбла</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          <a href="/news" className="lg:col-span-2 group relative rounded-2xl overflow-hidden glass-card glass-card-hover flex flex-col">
            {main.image_url ? (
              <div className="relative h-64 lg:h-72 overflow-hidden">
                <img src={main.image_url} alt={main.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-white/50 text-xs mb-1">{formatDate(main.published_at)}</p>
                  <h3 className="text-white font-display font-bold text-xl leading-tight">{main.title}</h3>
                </div>
              </div>
            ) : (
              <div className="p-6 flex-1">
                <p className="text-white/40 text-xs mb-2">{formatDate(main.published_at)}</p>
                <h3 className="text-white font-display font-bold text-2xl mb-3 leading-tight">{main.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed line-clamp-4">{main.body}</p>
              </div>
            )}
            {main.image_url && (
              <div className="p-5">
                <p className="text-white/50 text-sm leading-relaxed line-clamp-3">{main.body}</p>
              </div>
            )}
          </a>

          <div className="flex flex-col gap-4">
            {rest.slice(0, 3).map(item => (
              <a key={item.id} href="/news" className="group flex gap-4 rounded-2xl glass-card glass-card-hover overflow-hidden p-4">
                {item.image_url && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/40 text-xs mb-1">{formatDate(item.published_at)}</p>
                  <h4 className="text-white font-semibold text-sm leading-tight line-clamp-2">{item.title}</h4>
                  <p className="text-white/40 text-xs mt-1 line-clamp-2">{item.body}</p>
                </div>
              </a>
            ))}
            <a href="/news" className="text-center py-3 text-white/60 hover:text-white text-sm transition-colors glass rounded-xl hover:bg-white/10">
              Все новости →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NewsSection;
