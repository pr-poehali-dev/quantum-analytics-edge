import { useRef, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const BEATSTORE_BASE = "https://functions.poehali.dev/a6dc36ea-c97a-4781-9390-c33f3b312f53";

interface Artist {
  id: number;
  name: string;
  url: string | null;
  photo_url: string | null;
  sort_order: number;
}

const ArtistsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const load = (attempt = 1) => {
      fetch(`${BEATSTORE_BASE}?action=list-artists&_t=${Date.now()}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          const list = Array.isArray(data.artists) ? data.artists : [];
          if (list.length === 0 && attempt < 3) {
            setTimeout(() => load(attempt + 1), 1500 * attempt);
          } else {
            setArtists(list);
            setLoaded(true);
          }
        })
        .catch(() => {
          if (attempt < 3) setTimeout(() => load(attempt + 1), 1500 * attempt);
          else setLoaded(true);
        });
    };
    load();
  }, []);

  useEffect(() => {
    if (!loaded || artists.length === 0) return;
    let observer: IntersectionObserver | null = null;
    const timer = setTimeout(() => {
      if (!ref.current) { setIsVisible(true); return; }
      const rect = ref.current.getBoundingClientRect();
      if (rect.top < window.innerHeight) { setIsVisible(true); return; }
      observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
        { threshold: 0.05 }
      );
      observer.observe(ref.current);
    }, 50);
    return () => { clearTimeout(timer); observer?.disconnect(); };
  }, [loaded, artists.length]);

  const handleImgError = (id: number) => {
    setImgErrors((prev) => ({ ...prev, [id]: true }));
  };

  if (!loaded || artists.length === 0) return null;

  return (
    <section ref={ref} id="artists" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-semibold text-white/70 tracking-wide uppercase">
            Ростер лейбла
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Наши <span className="gradient-text">артисты</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Таланты, с которыми мы строим карьеры и создаём музыку
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {artists.map((artist, index) => {
            const hasError = imgErrors[artist.id];

            return (
              <a
                key={artist.id}
                href={artist.url || "#"}
                target={artist.url ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={`group relative rounded-2xl overflow-hidden glass-card glass-card-hover ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <div className="aspect-square w-full overflow-hidden">
                  {artist.photo_url && !hasError ? (
                    <img
                      src={artist.photo_url}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={() => handleImgError(artist.id)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <Icon name="Music" size={40} className="text-white/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-300" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-neon-violet/30 to-transparent" />
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-semibold text-sm leading-tight">
                    {artist.name}
                  </p>
                  {artist.url && (
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Icon name="ExternalLink" size={12} className="text-neon-fuchsia" />
                      <span className="text-neon-fuchsia text-xs">Слушать</span>
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ArtistsSection;
