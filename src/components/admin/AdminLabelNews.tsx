import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  is_published: boolean;
  created_at: string;
}

export default function AdminLabelNews() {
  const [releases, setReleases] = useState<LabelRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "", artist_name: "", description: "", external_link: "",
    genre: "", release_date: "", is_published: true,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    const res = await api.beatstore.adminLabelReleases();
    setReleases(res.releases || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });

  const handleAdd = async () => {
    if (!form.title.trim() || !form.artist_name.trim()) {
      setError("Укажите название и артиста");
      return;
    }
    setAdding(true);
    setError("");
    const payload: Record<string, unknown> = { ...form };
    if (coverFile) {
      payload.cover_data = await toBase64(coverFile);
      payload.cover_name = coverFile.name;
    }
    if (audioFile) {
      payload.audio_data = await toBase64(audioFile);
      payload.audio_name = audioFile.name;
    }
    const res = await api.beatstore.addLabelRelease(payload);
    if (res.release) {
      setAddOpen(false);
      setForm({ title: "", artist_name: "", description: "", external_link: "", genre: "", release_date: "", is_published: true });
      setCoverFile(null);
      setAudioFile(null);
      if (coverRef.current) coverRef.current.value = "";
      if (audioRef.current) audioRef.current.value = "";
      load();
    } else {
      setError(res.error || "Ошибка");
    }
    setAdding(false);
  };

  const togglePublish = async (id: number, current: boolean) => {
    await api.beatstore.updateLabelRelease({ id, is_published: !current });
    setReleases((prev) => prev.map((r) => r.id === id ? { ...r, is_published: !current } : r));
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить новинку?")) return;
    await api.beatstore.delLabelRelease(id);
    setReleases((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Новинки лейбла</h2>
          <p className="text-zinc-400 text-sm mt-0.5">
            Публичная страница:{" "}
            <a href="/label-news" target="_blank" className="text-purple-400 hover:text-purple-300">
              /label-news ↗
            </a>
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-purple-600 hover:bg-purple-500 text-white">
          <Icon name="Plus" size={16} className="mr-2" />
          Добавить
        </Button>
      </div>

      {loading ? (
        <p className="text-zinc-500 text-sm">Загружаю...</p>
      ) : releases.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Icon name="Disc3" size={40} className="mx-auto mb-3 opacity-30" />
          <p>Новинок пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {releases.map((r) => (
            <div key={r.id} className="bg-zinc-900 border border-white/10 rounded-xl p-4 flex items-center gap-4">
              {r.cover_url ? (
                <img src={r.cover_url} alt={r.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                  <Icon name="Music2" size={20} className="text-zinc-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.title}</p>
                <p className="text-purple-400 text-sm">{r.artist_name}</p>
                <div className="flex gap-3 mt-1">
                  {r.genre && <span className="text-zinc-500 text-xs">{r.genre}</span>}
                  {r.release_date && <span className="text-zinc-500 text-xs">{new Date(r.release_date).toLocaleDateString("ru")}</span>}
                  {r.audio_url && <span className="text-zinc-600 text-xs flex items-center gap-1"><Icon name="Music" size={10} />Есть аудио</span>}
                  {r.external_link && (
                    <a href={r.external_link} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      <Icon name="ExternalLink" size={10} />Ссылка
                    </a>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => togglePublish(r.id, r.is_published)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${r.is_published ? "bg-green-900/40 text-green-400 hover:bg-green-900/70" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"}`}
                >
                  {r.is_published ? "Опубликовано" : "Скрыто"}
                </button>
                <button onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-400">
                  <Icon name="Trash2" size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка добавления */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Новый релиз</h3>
              <button onClick={() => setAddOpen(false)} className="text-zinc-400 hover:text-white">
                <Icon name="X" size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Название трека / EP / альбома *"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <Input
                value={form.artist_name}
                onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                placeholder="Артист *"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  value={form.genre}
                  onChange={(e) => setForm({ ...form, genre: e.target.value })}
                  placeholder="Жанр"
                  className="bg-black border-white/10 text-white placeholder:text-zinc-600"
                />
                <Input
                  value={form.release_date}
                  onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                  type="date"
                  className="bg-black border-white/10 text-white"
                />
              </div>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Описание (необязательно)"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <Input
                value={form.external_link}
                onChange={(e) => setForm({ ...form, external_link: e.target.value })}
                placeholder="Ссылка для прослушивания (Spotify, ВКонтакте...)"
                className="bg-black border-white/10 text-white placeholder:text-zinc-600"
              />
              <div>
                <p className="text-zinc-400 text-xs mb-1">Обложка (JPG, PNG)</p>
                <input
                  ref={coverRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }}
                  className="text-zinc-400 text-sm"
                />
              </div>
              <div>
                <p className="text-zinc-400 text-xs mb-1">Аудио для превью (MP3, WAV — необязательно)</p>
                <input
                  ref={audioRef}
                  type="file"
                  accept=".mp3,.wav,.flac"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }}
                  className="text-zinc-400 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  className="accent-purple-500"
                />
                <span className="text-sm text-zinc-300">Сразу опубликовать</span>
              </label>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <Button
                onClick={handleAdd}
                disabled={adding || !form.title.trim() || !form.artist_name.trim()}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white"
              >
                {adding ? "Публикую..." : "Добавить релиз"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
