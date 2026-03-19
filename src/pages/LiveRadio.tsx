import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

const LABEL_URL = "https://music.yandex.ru/label/6178530";

function getSessionId() {
  let id = sessionStorage.getItem("ks_sid");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("ks_sid", id);
  }
  return id;
}

const artists = [
  { name: "TomLuv", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/17970337", embedUrl: "https://music.yandex.ru/iframe/#artist/17970337", color: "from-purple-900/40 to-zinc-900" },
  { name: "Нэтшанэт", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/24577979", embedUrl: "https://music.yandex.ru/iframe/#artist/24577979", color: "from-blue-900/40 to-zinc-900" },
  { name: "808 FAY", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/25131782", embedUrl: "https://music.yandex.ru/iframe/#artist/25131782", color: "from-orange-900/40 to-zinc-900" },
  { name: "VOINOVA", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/11202759", embedUrl: "https://music.yandex.ru/iframe/#artist/11202759", color: "from-rose-900/40 to-zinc-900" },
  { name: "Lill Kiska", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/23291999", embedUrl: "https://music.yandex.ru/iframe/#artist/23291999", color: "from-pink-900/40 to-zinc-900" },
  { name: "Макс Чуев", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/25536549", embedUrl: "https://music.yandex.ru/iframe/#artist/25536549", color: "from-green-900/40 to-zinc-900" },
  { name: "MAMATANK", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/22126498", embedUrl: "https://music.yandex.ru/iframe/#artist/22126498", color: "from-yellow-900/40 to-zinc-900" },
  { name: "TBOU DRUG", role: "Артист лейбла", yandexUrl: "https://music.yandex.ru/artist/25067872", embedUrl: "https://music.yandex.ru/iframe/#artist/25067872", color: "from-indigo-900/40 to-zinc-900" },
];

interface LikeInfo { total: number; liked: boolean; }
interface TopEntry { artist_name: string; likes: number; }

export default function LiveRadio() {
  const [activeWidget, setActiveWidget] = useState<string | null>(null);
  const [likes, setLikes] = useState<Record<string, LikeInfo>>({});
  const [top, setTop] = useState<TopEntry[]>([]);
  const sessionId = getSessionId();

  useEffect(() => {
    api.radio.top(sessionId).then((res) => {
      if (res.all_likes) setLikes(res.all_likes);
      if (res.top) setTop(res.top);
    }).catch(() => null);
  }, []);

  const handleLike = async (artistName: string) => {
    const current = likes[artistName];
    const isLiked = current?.liked;
    const optimistic: LikeInfo = { total: (current?.total || 0) + (isLiked ? -1 : 1), liked: !isLiked };
    setLikes((prev) => ({ ...prev, [artistName]: optimistic }));

    const res = isLiked
      ? await api.radio.unlike(artistName, sessionId)
      : await api.radio.like(artistName, sessionId);

    if (res.likes !== undefined) {
      setLikes((prev) => ({ ...prev, [artistName]: { total: res.likes, liked: !isLiked } }));
    }
    api.radio.top(sessionId).then((r) => { if (r.top) setTop(r.top); }).catch(() => null);
  };

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-bold tracking-tighter">Калашников Саунд</a>
        <div className="flex items-center gap-4">
          <a href="/" className="text-zinc-400 hover:text-white text-sm transition-colors">← На главную</a>
          <a href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">Кабинет</a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-medium uppercase tracking-wider">Live Radio</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4">Музыка лейбла</h1>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            Слушай треки артистов KALASHNIKOV SOUND на Яндекс.Музыке
          </p>
          <a
            href={LABEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-semibold rounded-full transition-colors"
          >
            <Icon name="Music" size={18} />
            Открыть лейбл на Яндекс.Музыке
          </a>
        </div>

        {/* Топ 3 за месяц */}
        {top.length > 0 && (
          <div className="mb-10 bg-gradient-to-r from-yellow-900/20 to-zinc-900 border border-yellow-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon name="Trophy" size={20} className="text-yellow-400" />
              <h2 className="font-bold text-lg">Топ 3 за месяц</h2>
              <span className="text-zinc-500 text-sm">(по лайкам)</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {top.map((t, i) => (
                <div key={t.artist_name} className="text-center bg-black/30 rounded-xl p-4 border border-white/5">
                  <div className="text-3xl mb-2">{medals[i]}</div>
                  <p className="font-bold text-sm">{t.artist_name}</p>
                  <p className="text-zinc-400 text-xs mt-1">
                    <Icon name="Heart" size={10} className="inline text-red-400 mr-1" />
                    {t.likes} лайков
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {artists.map((artist) => {
            const likeInfo = likes[artist.name];
            const isLiked = likeInfo?.liked || false;
            const likeCount = likeInfo?.total || 0;
            return (
              <div key={artist.name} className={`bg-gradient-to-br ${artist.color} border border-white/10 rounded-2xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{artist.name}</h2>
                    <p className="text-zinc-400 text-sm">{artist.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLike(artist.name)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isLiked ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-white/5 text-zinc-400 border border-white/10 hover:border-red-400/40 hover:text-red-400"}`}
                    >
                      <Icon name="Heart" size={14} className={isLiked ? "fill-red-400 text-red-400" : ""} />
                      {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                    <a
                      href={artist.yandexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-sm font-semibold rounded-full transition-colors"
                    >
                      <Icon name="ExternalLink" size={14} />
                      Слушать
                    </a>
                  </div>
                </div>

                <button
                  onClick={() => setActiveWidget(activeWidget === artist.name ? null : artist.name)}
                  className="w-full text-left text-zinc-400 hover:text-white text-sm transition-colors flex items-center gap-2"
                >
                  <Icon name={activeWidget === artist.name ? "ChevronUp" : "ChevronDown"} size={16} />
                  {activeWidget === artist.name ? "Скрыть плеер" : "Открыть плеер"}
                </button>

                {activeWidget === artist.name && (
                  <div className="mt-4 rounded-xl overflow-hidden">
                    <iframe
                      src={artist.embedUrl}
                      frameBorder="0"
                      allow="autoplay"
                      className="w-full"
                      style={{ height: "400px" }}
                      title={`${artist.name} — Яндекс.Музыка`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-yellow-500/10 p-4 rounded-full">
              <Icon name="Radio" size={32} className="text-yellow-400" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Весь каталог лейбла</h3>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Все треки, альбомы и синглы артистов KALASHNIKOV SOUND в одном месте
          </p>
          <a
            href={LABEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-zinc-200 text-black font-semibold rounded-full transition-colors"
          >
            <Icon name="Music2" size={18} />
            Открыть лейбл
          </a>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-zinc-500 text-sm mb-4">Встроенный плеер лейбла</p>
            <div className="rounded-xl overflow-hidden">
              <iframe
                src="https://music.yandex.ru/iframe/#label/6178530"
                frameBorder="0"
                allow="autoplay"
                className="w-full"
                style={{ height: "450px" }}
                title="KALASHNIKOV SOUND — Яндекс.Музыка"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-zinc-600 text-sm">
            Хочешь стать частью лейбла?{" "}
            <a href="/#demo" className="text-zinc-400 hover:text-white transition-colors">Отправь демо →</a>
          </p>
        </div>
      </div>
    </div>
  );
}
