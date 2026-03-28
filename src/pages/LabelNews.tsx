import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface LabelRelease {
  id: number;
  title: string;
  artist_name: string;
  description: string | null;
  cover_url: string | null;
  audio_url: string | null;
  external_link: string | null;
  genre: string | null;
  release_date: string | null;
  created_at: string;
}

export default function LabelNews() {
  const [releases, setReleases] = useState<LabelRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.beatstore.listLabelReleases().then((res) => {
      setReleases(res.releases || []);
      setLoading(false);
    });
  }, []);

  const playTrack = (release: LabelRelease) => {
    if (!release.audio_url) return;
    if (playingId === release.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(release.audio_url);
    audioRef.current = audio;
    audio.play();
    setPlayingId(release.id);
    audio.onended = () => setPlayingId(null);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Шапка */}
      <header className="border-b border-white/10 bg-black/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight">Калашников Саунд</a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="/beatstore" className="hover:text-white transition-colors">BeatStore</a>
            <a href="/label-news" className="text-white font-semibold">Новинки лейбла</a>
            <a href="/radio" className="hover:text-white transition-colors flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Live Radio
            </a>
            <a href="/login" className="hover:text-white transition-colors">Кабинет</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            Новинки <span className="text-purple-400">KS LABEL</span>
          </h1>
          <p className="text-zinc-400 text-sm">Свежие релизы артистов лейбла</p>
        </div>

        {loading ? (
          <div className="text-center py-20 text-zinc-500">Загружаю...</div>
        ) : releases.length === 0 ? (
          <div className="text-center py-20">
            <Icon name="Disc3" size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500">Новинок пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {releases.map((release) => (
              <div
                key={release.id}
                className="bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden hover:border-purple-500/40 transition-colors group"
              >
                {/* Обложка */}
                <div className="relative aspect-square">
                  {release.cover_url ? (
                    <img
                      src={release.cover_url}
                      alt={release.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Icon name="Music2" size={48} className="text-zinc-600" />
                    </div>
                  )}
                  {/* Кнопка play */}
                  {release.audio_url && (
                    <button
                      onClick={() => playTrack(release)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all"
                    >
                      <div className={`w-14 h-14 rounded-full bg-purple-600 flex items-center justify-center shadow-lg transition-all ${
                        playingId === release.id ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
                      }`}>
                        <Icon name={playingId === release.id ? "Pause" : "Play"} size={24} className="text-white" />
                      </div>
                    </button>
                  )}
                  {release.genre && (
                    <span className="absolute top-3 left-3 text-xs bg-black/70 text-purple-300 px-2 py-1 rounded-full backdrop-blur">
                      {release.genre}
                    </span>
                  )}
                  {playingId === release.id && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-black/70 px-2 py-1 rounded-full">
                      <div className="flex gap-0.5 items-end h-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-purple-400 rounded-full animate-pulse"
                            style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-white ml-1">Играет</span>
                    </div>
                  )}
                </div>

                {/* Инфо */}
                <div className="p-4">
                  <p className="font-bold text-base truncate">{release.title}</p>
                  <p className="text-purple-400 text-sm">{release.artist_name}</p>
                  {release.description && (
                    <p className="text-zinc-400 text-xs mt-2 line-clamp-2">{release.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    {release.release_date && (
                      <span className="text-zinc-600 text-xs">
                        {new Date(release.release_date).toLocaleDateString("ru", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    )}
                    {release.external_link && (
                      <a
                        href={release.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors ml-auto"
                      >
                        Слушать <Icon name="ExternalLink" size={12} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
