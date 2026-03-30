import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

interface Beat {
  id: number;
  title: string;
  genre: string | null;
  bpm: number | null;
  price: number | null;
  currency: string;
  contact_telegram: string | null;
  contact_email: string | null;
  file_url: string;
  file_name: string;
  cover_url: string | null;
  description: string | null;
  tags: string | null;
  plays: number;
  created_at: string;
}

const GENRES = ["Все", "Trap", "Drill", "R&B", "Hip-Hop", "Pop", "Club", "Lo-fi", "Другой"];

export default function BeatStore() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("Все");
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [form, setForm] = useState({
    title: "", genre: "", bpm: "", price: "", currency: "RUB",
    contact_telegram: "", contact_email: "", description: "", tags: "",
  });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const loadBeats = async () => {
    setLoading(true);
    const params = genre !== "Все" ? `&genre=${encodeURIComponent(genre)}` : "";
    const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
    const res = await api.beatstore.listBeats(params + searchParam);
    setBeats(res.beats || []);
    setLoading(false);
  };

  useEffect(() => { loadBeats(); }, [genre]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadBeats();
  };

  const playBeat = (beat: Beat) => {
    if (playingId === beat.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(beat.file_url);
    audioRef.current = audio;
    audio.play();
    setPlayingId(beat.id);
    api.beatstore.playBeat(beat.id);
    audio.onended = () => setPlayingId(null);
  };

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить этот бит?")) return;
    setDeletingId(id);
    await api.beatstore.delBeat(id);
    setBeats((prev) => prev.filter((b) => b.id !== id));
    setDeletingId(null);
  };

  const handleUpload = async () => {
    if (!form.title.trim() || !audioFile) return;
    if (!form.contact_telegram.trim() && !form.contact_email.trim()) {
      setUploadError("Укажите Telegram или email для связи с покупателями");
      return;
    }
    setUploading(true);
    setUploadError("");
    const file_data = await toBase64(audioFile);
    const payload: Record<string, unknown> = {
      ...form,
      bpm: form.bpm ? parseInt(form.bpm) : undefined,
      price: form.price ? parseFloat(form.price) : undefined,
      file_data,
      file_name: audioFile.name,
    };
    if (coverFile) {
      payload.cover_data = await toBase64(coverFile);
      payload.cover_name = coverFile.name;
    }
    const res = await api.beatstore.uploadBeat(payload);
    if (res.beat) {
      setUploadOpen(false);
      setForm({ title: "", genre: "", bpm: "", price: "", currency: "RUB", contact_telegram: "", contact_email: "", description: "", tags: "" });
      setAudioFile(null);
      setCoverFile(null);
      loadBeats();
    } else {
      setUploadError(res.error || "Ошибка загрузки");
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Шапка */}
      <header className="border-b border-white/10 bg-black/95 backdrop-blur sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-bold tracking-tight">Калашников Саунд</a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="/beatstore" className="text-white font-semibold">BeatStore</a>
            <a href="/label-news" className="hover:text-white transition-colors">Новинки лейбла</a>
            <a href="/radio" className="hover:text-white transition-colors flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
              Live Radio
            </a>
            <a href="/login" className="hover:text-white transition-colors">Кабинет</a>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Заголовок */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">BeatStore <span className="text-purple-400">KS LABEL</span></h1>
            <p className="text-zinc-400 text-sm">Площадка продажи битов — размещай бит, указывай цену и контакт</p>
          </div>
          <Button
            onClick={() => setUploadOpen(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white shrink-0"
          >
            <Icon name="Upload" size={16} className="mr-2" />
            Загрузить бит
          </Button>
        </div>

        {/* Поиск и фильтры */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию..."
              className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600"
            />
            <Button type="submit" variant="outline" className="border-white/20 text-white hover:bg-white/10 shrink-0">
              <Icon name="Search" size={16} />
            </Button>
          </form>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => setGenre(g)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  genre === g ? "bg-purple-600 text-white" : "bg-zinc-900 text-zinc-400 hover:text-white border border-white/10"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Список битов */}
        {loading ? (
          <div className="text-center py-20 text-zinc-500">Загружаю...</div>
        ) : beats.length === 0 ? (
          <div className="text-center py-20">
            <Icon name="Music" size={48} className="mx-auto mb-4 text-zinc-700" />
            <p className="text-zinc-500">Битов пока нет</p>
            <p className="text-zinc-600 text-sm mt-1">Стань первым — загрузи свой бит!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {beats.map((beat) => (
              <div key={beat.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                {/* Обложка / кнопка play */}
                <button
                  onClick={() => playBeat(beat)}
                  className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative group"
                >
                  {beat.cover_url ? (
                    <img src={beat.cover_url} alt={beat.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                      <Icon name="Music2" size={24} className="text-purple-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Icon name={playingId === beat.id ? "Pause" : "Play"} size={22} className="text-white" />
                  </div>
                  {playingId === beat.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Icon name="Pause" size={22} className="text-white" />
                    </div>
                  )}
                </button>

                {/* Инфо */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{beat.title}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {beat.genre && (
                      <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full">{beat.genre}</span>
                    )}
                    {beat.bpm && (
                      <span className="text-xs text-zinc-500">{beat.bpm} BPM</span>
                    )}
                    <span className="text-xs text-zinc-600 flex items-center gap-1">
                      <Icon name="Headphones" size={11} />
                      {beat.plays}
                    </span>
                  </div>
                  {beat.description && (
                    <p className="text-zinc-500 text-xs mt-0.5 truncate">{beat.description}</p>
                  )}
                </div>

                {/* Цена и контакт */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {beat.price ? (
                    <span className="text-lg font-bold text-white">
                      {beat.price.toLocaleString("ru")} <span className="text-sm text-zinc-400">{beat.currency}</span>
                    </span>
                  ) : (
                    <span className="text-sm text-green-400 font-semibold">Бесплатно</span>
                  )}
                  <div className="flex gap-2 flex-wrap justify-end">
                    {beat.contact_telegram && (
                      <a
                        href={`https://t.me/${beat.contact_telegram.replace("@", "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs bg-blue-900/40 text-blue-300 hover:bg-blue-900/70 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Icon name="Send" size={12} />
                        Telegram
                      </a>
                    )}
                    {beat.contact_email && (
                      <a
                        href={`mailto:${beat.contact_email}`}
                        className="flex items-center gap-1 text-xs bg-zinc-800 text-zinc-300 hover:bg-zinc-700 px-2 py-1 rounded-lg transition-colors"
                      >
                        <Icon name="Mail" size={12} />
                        Email
                      </a>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(beat.id)}
                        disabled={deletingId === beat.id}
                        className="flex items-center gap-1 text-xs bg-red-900/40 text-red-400 hover:bg-red-900/70 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Icon name={deletingId === beat.id ? "Loader2" : "Trash2"} size={12} />
                        Удалить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модалка загрузки */}
      {uploadOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold">Загрузить бит</h2>
              <button onClick={() => setUploadOpen(false)} className="text-zinc-400 hover:text-white">
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Название бита *"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  className="bg-black border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                >
                  <option value="">Жанр</option>
                  {GENRES.slice(1).map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <Input
                  value={form.bpm}
                  onChange={(e) => setForm({ ...form, bpm: e.target.value })}
                  placeholder="BPM"
                  type="number"
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="Цена (0 = бесплатно)"
                  type="number"
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                />
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  className="bg-black border border-white/10 rounded-md px-3 py-2 text-white text-sm"
                >
                  <option value="RUB">₽ RUB</option>
                  <option value="USD">$ USD</option>
                  <option value="EUR">€ EUR</option>
                </select>
              </div>
              <Input
                value={form.contact_telegram}
                onChange={(e) => setForm({ ...form, contact_telegram: e.target.value })}
                placeholder="Telegram (@username)"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <Input
                value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="Email для связи"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Описание (необязательно)"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <Input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Теги через запятую (dark, melodic...)"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />

              <div>
                <p className="text-zinc-400 text-xs mb-1">Аудиофайл (MP3, WAV) *</p>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,.flac,.ogg"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }}
                  className="text-zinc-400 text-sm"
                />
              </div>
              <div>
                <p className="text-zinc-400 text-xs mb-1">Обложка (JPG, PNG — необязательно)</p>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }}
                  className="text-zinc-400 text-sm"
                />
              </div>

              {uploadError && <p className="text-red-400 text-sm">{uploadError}</p>}

              <Button
                onClick={handleUpload}
                disabled={uploading || !form.title.trim() || !audioFile}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white"
              >
                {uploading ? "Загружаю..." : "Опубликовать бит"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}