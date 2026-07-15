import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface RadioTrack {
  id: number;
  title: string;
  artist: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " КБ";
  return (bytes / 1024 / 1024).toFixed(1) + " МБ";
}

const ic = "w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#f5a623]/40 transition-colors";

export default function AdminRadio() {
  const [tracks, setTracks] = useState<RadioTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ title: "", artist: "", sort_order: "0", is_active: true });
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [form, setForm] = useState({ title: "", artist: "", sort_order: "0" });
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.radio.getAllTracks();
    setTracks(res.tracks || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !audioFile) return;
    setSaving(true);
    setUploading(true);
    setUploadProgress(10);
    setMsg("");

    let fileData: string;
    try {
      fileData = await toBase64(audioFile);
    } catch {
      setMsg("Ошибка чтения файла");
      setSaving(false);
      setUploading(false);
      setUploadProgress(0);
      return;
    }
    setUploadProgress(40);

    let res: Record<string, unknown>;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      const r = await fetch(
        `https://functions.poehali.dev/cf183d3e-0346-4b33-a765-9237aa819f5c?action=upload-radio-track`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Token": localStorage.getItem("ks_token") || "" },
          body: JSON.stringify({
            title: form.title.trim(),
            artist: form.artist.trim() || undefined,
            file_data: fileData,
            file_name: audioFile.name,
            sort_order: parseInt(form.sort_order) || 0,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);
      setUploadProgress(90);
      const text = await r.text();
      try { res = JSON.parse(text); } catch { res = { error: `Ответ сервера: ${text.slice(0, 100)}` }; }
    } catch (e: unknown) {
      const msg = e instanceof Error && e.name === "AbortError" ? "Превышено время ожидания (2 мин). Попробуй файл меньшего размера." : "Ошибка сети при загрузке";
      setMsg(msg);
      setSaving(false);
      setUploading(false);
      setUploadProgress(0);
      return;
    }

    setUploadProgress(100);
    setUploading(false);

    if (res.track) {
      setTracks(prev => [...prev, res.track as RadioTrack]);
      setForm({ title: "", artist: "", sort_order: "0" });
      setAudioFile(null);
      setAdding(false);
      setMsg("Трек добавлен в плейлист");
    } else {
      setMsg((res.error as string) || "Ошибка загрузки");
    }
    setSaving(false);
    setUploadProgress(0);
  };

  const startEdit = (track: RadioTrack) => {
    setEditingId(track.id);
    setEditForm({ title: track.title, artist: track.artist || "", sort_order: String(track.sort_order), is_active: track.is_active });
  };

  const handleSaveEdit = async (id: number) => {
    setSaving(true);
    const res = await api.radio.updateTrack({
      id,
      title: editForm.title.trim(),
      artist: editForm.artist.trim() || null,
      sort_order: parseInt(editForm.sort_order) || 0,
      is_active: editForm.is_active,
    });
    if (res.ok) {
      setTracks(prev => prev.map(t => t.id === id ? { ...t, ...editForm, sort_order: parseInt(editForm.sort_order) || 0 } : t));
      setEditingId(null);
      setMsg("Сохранено");
    } else {
      setMsg(res.error || "Ошибка");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить трек из плейлиста?")) return;
    const res = await api.radio.deleteTrack(id);
    if (res.ok) {
      setTracks(prev => prev.filter(t => t.id !== id));
      if (playingId === id) stopPlay();
    }
  };

  const togglePlay = (track: RadioTrack) => {
    if (playingId === track.id) {
      stopPlay();
      return;
    }
    stopPlay();
    setPlayingId(track.id);
    const audio = new Audio(track.file_url);
    audioRef.current = audio;
    audio.play().catch(() => null);
    audio.onended = () => setPlayingId(null);
  };

  const stopPlay = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Радио плейлист</h3>
          <p className="text-slate-500 text-xs mt-0.5">Треки играют по кругу на странице радио</p>
        </div>
        <Button onClick={() => setAdding(v => !v)} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
          <Icon name="Upload" size={15} className="mr-1.5" />
          Загрузить трек
        </Button>
      </div>

      {msg && <p className={`text-sm ${msg.includes("Ошибка") ? "text-red-400" : "text-green-400"}`}>{msg}</p>}

      {adding && (
        <div className="bg-[#1a2636] border border-[#f5a623]/20 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-sm text-[#f5a623]">Новый трек</h4>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Название трека *" className={ic} />
          <input value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} placeholder="Исполнитель" className={ic} />
          <input value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} placeholder="Порядок (0, 1, 2...)" type="number" className={ic} />

          <div>
            <p className="text-xs text-slate-400 mb-1.5">Аудиофайл <span className="text-slate-600">(рекомендуется до 30 МБ)</span></p>
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg" onChange={e => setAudioFile(e.target.files?.[0] || null)} className="hidden" />
            <div className="flex items-center gap-3">
              {audioFile && (
                <div className="flex items-center gap-2 bg-[#0f1923] rounded-lg px-3 py-2 text-xs text-slate-300">
                  <Icon name="Music2" size={14} className="text-[#f5a623]" />
                  <span className="truncate max-w-[160px]">{audioFile.name}</span>
                  <span className="text-slate-500">{fmtSize(audioFile.size)}</span>
                </div>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-[#0f1923] hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors">
                <Icon name="Upload" size={14} />
                {audioFile ? "Заменить" : "Выбрать файл"}
              </button>
            </div>
          </div>

          {uploading && (
            <div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#f5a623] rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-1">Загружаю трек...</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !form.title.trim() || !audioFile} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
              {saving ? "Загружаю..." : "Добавить"}
            </Button>
            <Button onClick={() => { setAdding(false); setAudioFile(null); }} size="sm" variant="ghost" className="text-slate-400">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Загружаю...</div>
      ) : tracks.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Icon name="Music2" size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Плейлист пуст. Загрузи первый трек.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tracks.map((track, idx) => (
            <div key={track.id} className={`bg-[#1a2636] border rounded-xl p-4 ${editingId === track.id ? "border-[#f5a623]/30" : "border-white/5"} ${!track.is_active ? "opacity-50" : ""}`}>
              {editingId === track.id ? (
                <div className="space-y-3">
                  <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Название" className={ic} />
                  <input value={editForm.artist} onChange={e => setEditForm({ ...editForm, artist: e.target.value })} placeholder="Исполнитель" className={ic} />
                  <input value={editForm.sort_order} onChange={e => setEditForm({ ...editForm, sort_order: e.target.value })} placeholder="Порядок" type="number" className={ic} />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} className="accent-[#f5a623]" />
                    <span className="text-sm text-slate-300">Активен (играет в плейлисте)</span>
                  </label>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSaveEdit(track.id)} disabled={saving} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
                      {saving ? "Сохраняю..." : "Сохранить"}
                    </Button>
                    <Button onClick={() => setEditingId(null)} size="sm" variant="ghost" className="text-slate-400">Отмена</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-5 text-center shrink-0">{idx + 1}</span>
                  <button
                    onClick={() => togglePlay(track)}
                    className="w-9 h-9 rounded-lg bg-[#0f1923] flex items-center justify-center shrink-0 hover:bg-[#f5a623]/10 transition-colors"
                  >
                    <Icon name={playingId === track.id ? "Pause" : "Play"} size={16} className={playingId === track.id ? "text-[#f5a623]" : "text-slate-400"} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{track.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {track.artist && <span>{track.artist} · </span>}
                      {fmtSize(track.file_size)}
                      {!track.is_active && <span className="ml-2 text-yellow-500">скрыт</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(track)} className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => handleDelete(track.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10">
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}