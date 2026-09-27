import { useRef, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

const BEATSTORE_BASE = "https://functions.poehali.dev/76bda3d9-5afb-4469-b432-9f145059aa2e";

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
      fetch(`${BEATSTORE_BASE}?action=list-artists&_t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then(data => {
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
    <section ref={ref} id="artists" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Наши артисты
          </h2>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Таланты, с которыми мы строим карьеры и создаём музыку
          </p>
        </div>

        <div
          className={`transition-all duration-700 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Carousel
            opts={{ align: "start", loop: artists.length > 5 }}
            className="max-w-6xl mx-auto"
          >
            <CarouselContent className="-ml-4">
              {artists.map((artist) => {
                const hasError = imgErrors[artist.id];
                return (
                  <CarouselItem
                    key={artist.id}
                    className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                  >
                    <a
                      href={artist.url || "#"}
                      target={artist.url ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="group relative block rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-purple-900/20"
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
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <Icon name="Music" size={40} className="text-zinc-600" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-white font-semibold text-sm leading-tight">
                          {artist.name}
                        </p>
                        {artist.url && (
                          <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Icon name="ExternalLink" size={12} className="text-purple-400" />
                            <span className="text-purple-400 text-xs">Слушать</span>
                          </div>
                        )}
                      </div>
                    </a>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-4 lg:-left-12 bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 hover:text-white" />
            <CarouselNext className="hidden sm:flex -right-4 lg:-right-12 bg-zinc-900 border-white/10 text-white hover:bg-zinc-800 hover:text-white" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default ArtistsSection;
