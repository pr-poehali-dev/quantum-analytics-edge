import { useRef, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const artists = [
  { name: "TomLuv", url: "https://music.yandex.ru/artist/17970337", photo: "https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/8eb66602-d35a-4118-852d-3f6329c87dd0.jpg" },
  { name: "Нэтшанэт", url: "https://music.yandex.ru/artist/24577979", photo: "https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/f7d19650-b5a0-4229-b27e-b9b1977b886b.jpeg" },
  { name: "VOINOVA", url: "https://music.yandex.ru/artist/11202759" },
  { name: "808 FAY", url: "https://music.yandex.ru/artist/25131782", photo: "https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/4866b3a1-ab4b-4b78-961e-852b475a16a0.jpeg" },
  { name: "DIMUSIK", url: "https://music.yandex.ru/artist/16745184" },
  { name: "Макс Чуев", url: "https://music.yandex.ru/artist/25536549" },
  { name: "Lill Kiska", url: "https://music.yandex.ru/artist/23291999", photo: "https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/d7f84708-bd5b-4310-8b00-9ee8452deca9.jpg" },
  { name: "TBOU DRUG", url: "https://music.yandex.ru/artist/25067872" },
  { name: "StasFox", url: "https://music.yandex.ru/artist/24519124", photo: "https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/43dcb379-258a-46fb-a18a-570a29543ec4.jpg" },
  { name: "MAMATANK", url: "https://music.yandex.ru/artist/22126498" },
];

const getAvatarUrl = (artistId: string) =>
  `https://avatars.yandex.net/get-music-artist-cover/${artistId}/200x200`;

const extractId = (url: string) => url.split("/").pop() || "";

const ArtistsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleImgError = (name: string) => {
    setImgErrors((prev) => ({ ...prev, [name]: true }));
  };

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

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {artists.map((artist, index) => {
            const id = extractId(artist.url);
            const hasError = imgErrors[artist.name];

            return (
              <a
                key={artist.name}
                href={artist.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 hover:border-purple-500/50 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-purple-900/20 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 60}ms` }}
              >
                <div className="aspect-square w-full overflow-hidden">
                  {artist.photo ? (
                    <img
                      src={artist.photo}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : !hasError ? (
                    <img
                      src={`https://avatars.mds.yandex.net/get-music-artist-cover/${id}/200x200`}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={() => handleImgError(artist.name)}
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
                  <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Icon name="ExternalLink" size={12} className="text-purple-400" />
                    <span className="text-purple-400 text-xs">Яндекс Музыка</span>
                  </div>
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