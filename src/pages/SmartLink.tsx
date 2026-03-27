import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface SmartLinkData {
  id: number;
  release_id: number;
  slug: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  description: string | null;
  links: { platform: string; url: string; icon: string }[];
}

const PLATFORM_COLORS: Record<string, string> = {
  "Spotify": "bg-[#1DB954] hover:bg-[#1aa34a]",
  "Apple Music": "bg-[#FA243C] hover:bg-[#e01f35]",
  "YouTube Music": "bg-[#FF0000] hover:bg-[#cc0000]",
  "VK Музыка": "bg-[#4C75A3] hover:bg-[#3d5f82]",
  "Яндекс Музыка": "bg-[#FFCC00] hover:bg-[#e6b800] text-black",
  "Deezer": "bg-[#A238FF] hover:bg-[#8a2fe0]",
  "Другое": "bg-zinc-700 hover:bg-zinc-600",
};

const PLATFORM_ICONS: Record<string, string> = {
  "Spotify": "Music",
  "Apple Music": "Music2",
  "YouTube Music": "Youtube",
  "VK Музыка": "Music",
  "Яндекс Музыка": "Music",
  "Deezer": "Music",
  "Другое": "ExternalLink",
};

export default function SmartLink() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<SmartLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.smartLinks.public(slug).then((res) => {
      if (res.error || !res.title) {
        setNotFound(true);
      } else {
        setData(res);
      }
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white gap-4">
        <Icon name="Music" size={48} className="text-zinc-700" />
        <p className="text-zinc-500 text-lg">Страница не найдена</p>
        <a href="/" className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors">
          На главную
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Обложка */}
        <div className="flex flex-col items-center gap-5">
          {data.cover_url ? (
            <img
              src={data.cover_url}
              alt={data.title}
              className="w-52 h-52 rounded-2xl object-cover shadow-2xl shadow-black/60"
            />
          ) : (
            <div className="w-52 h-52 rounded-2xl bg-zinc-900 flex items-center justify-center">
              <Icon name="Music" size={64} className="text-zinc-700" />
            </div>
          )}

          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">{data.title}</h1>
            {data.artist_name && (
              <p className="text-zinc-400 mt-1">{data.artist_name}</p>
            )}
            {data.description && (
              <p className="text-zinc-500 text-sm mt-2 leading-relaxed">{data.description}</p>
            )}
          </div>
        </div>

        {/* Ссылки на платформы */}
        {data.links.length > 0 ? (
          <div className="space-y-3">
            {data.links.map((link, idx) => {
              const colorClass = PLATFORM_COLORS[link.platform] || "bg-zinc-700 hover:bg-zinc-600";
              const iconName = PLATFORM_ICONS[link.platform] || link.icon || "ExternalLink";
              const isYandex = link.platform === "Яндекс Музыка";
              return (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between w-full px-5 py-4 rounded-xl font-medium transition-all ${colorClass} ${isYandex ? "text-black" : "text-white"}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name={iconName} size={18} />
                    <span>{link.platform}</span>
                  </div>
                  <Icon name="ExternalLink" size={14} className="opacity-60" />
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-zinc-600 text-sm text-center">Ссылки скоро появятся</p>
        )}

        {/* Подвал */}
        <div className="text-center pt-4">
          <a href="/" className="text-zinc-700 text-xs hover:text-zinc-500 transition-colors">
            Kalashnikov Sound
          </a>
        </div>
      </div>
    </div>
  );
}
