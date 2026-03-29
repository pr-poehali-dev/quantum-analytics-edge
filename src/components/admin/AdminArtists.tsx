import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Artist {
  id: number;
  name: string;
  url: string | null;
  photo_url: string | null;
  sort_order: number;
  is_visible: boolean;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ic = "w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#f5a623]/40 transition-colors";

export default function AdminArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({ name: "", url: "", sort_order: "0" });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState<{ name: string; url: string; sort_order: string; is_visible: boolean }>({ name: "", url: "", sort_order: "0", is_visible: true });
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.beatstore.adminArtists();
    setArtists(res.artists || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setMsg("");
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      url: form.url.trim() || undefined,
      sort_order: parseInt(form.sort_order) || 0,
    };
    if (photoFile) {
      payload.file_data = await toBase64(photoFile);
      payload.file_name = photoFile.name;
    }
    const res = await api.beatstore.addArtist(payload);
    if (res.artist) {
      setArtists(prev => [...prev, res.artist]);
      setForm({ name: "", url: "", sort_order: "0" });
      setPhotoFile(null);
      setPhotoPreview(null);
      setAdding(false);
      setMsg("Артист добавлен");
    } else {
      setMsg(res.error || "Ошибка");
    }
    setSaving(false);
  };

  const startEdit = (artist: Artist) => {
    setEditingId(artist.id);
    setEditForm({ name: artist.name, url: artist.url || "", sort_order: String(artist.sort_order), is_visible: artist.is_visible });
    setEditPhotoFile(null);
    setEditPhotoPreview(artist.photo_url);
  };

  const handleSaveEdit = async (id: number) => {
    setSaving(true);
    setMsg("");
    const payload: Record<string, unknown> = {
      id,
      name: editForm.name.trim(),
      url: editForm.url.trim() || null,
      sort_order: parseInt(editForm.sort_order) || 0,
      is_visible: editForm.is_visible,
    };
    if (editPhotoFile) {
      payload.file_data = await toBase64(editPhotoFile);
      payload.file_name = editPhotoFile.name;
    }
    const res = await api.beatstore.updateArtist(payload);
    if (res.ok) {
      setArtists(prev => prev.map(a => a.id === id ? { ...a, ...editForm, sort_order: parseInt(editForm.sort_order) || 0, photo_url: editPhotoFile ? editPhotoPreview : a.photo_url } : a));
      setEditingId(null);
      setMsg("Сохранено");
      load();
    } else {
      setMsg(res.error || "Ошибка сохранения");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить артиста?")) return;
    const res = await api.beatstore.delArtist(id);
    if (res.ok) setArtists(prev => prev.filter(a => a.id !== id));
  };

  const handlePhotoChange = (file: File, isEdit = false) => {
    const url = URL.createObjectURL(file);
    if (isEdit) { setEditPhotoFile(file); setEditPhotoPreview(url); }
    else { setPhotoFile(file); setPhotoPreview(url); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Артисты на главной</h3>
          <p className="text-slate-500 text-xs mt-0.5">Управление блоком артистов на главной странице</p>
        </div>
        <Button onClick={() => setAdding(v => !v)} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
          <Icon name="UserPlus" size={15} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      {msg && <p className="text-green-400 text-sm">{msg}</p>}

      {adding && (
        <div className="bg-[#1a2636] border border-[#f5a623]/20 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-sm text-[#f5a623]">Новый артист</h4>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Имя артиста *" className={ic} />
          <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="Ссылка (Яндекс.Музыка, ВК...)" className={ic} />
          <input value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} placeholder="Порядок (0, 1, 2...)" type="number" className={ic} />

          <div>
            <p className="text-xs text-slate-400 mb-1.5">Фото артиста</p>
            <input ref={photoRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handlePhotoChange(e.target.files[0])} className="hidden" />
            <div className="flex items-center gap-3">
              {photoPreview && <img src={photoPreview} alt="preview" className="w-14 h-14 rounded-xl object-cover" />}
              <button type="button" onClick={() => photoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-[#0f1923] hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors">
                <Icon name="Upload" size={14} />
                {photoFile ? photoFile.name : "Выбрать фото"}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !form.name.trim()} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
              {saving ? "Сохраняю..." : "Добавить"}
            </Button>
            <Button onClick={() => { setAdding(false); setPhotoFile(null); setPhotoPreview(null); }} size="sm" variant="ghost" className="text-slate-400">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Загружаю...</div>
      ) : (
        <div className="space-y-2">
          {artists.map(artist => (
            <div key={artist.id} className={`bg-[#1a2636] border rounded-xl p-4 ${editingId === artist.id ? "border-[#f5a623]/30" : "border-white/5"}`}>
              {editingId === artist.id ? (
                <div className="space-y-3">
                  <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Имя" className={ic} />
                  <input value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} placeholder="Ссылка" className={ic} />
                  <input value={editForm.sort_order} onChange={e => setEditForm({ ...editForm, sort_order: e.target.value })} placeholder="Порядок" type="number" className={ic} />

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_visible} onChange={e => setEditForm({ ...editForm, is_visible: e.target.checked })} className="accent-[#f5a623]" />
                    <span className="text-sm text-slate-300">Показывать на сайте</span>
                  </label>

                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Фото</p>
                    <input ref={editPhotoRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handlePhotoChange(e.target.files[0], true)} className="hidden" />
                    <div className="flex items-center gap-3">
                      {editPhotoPreview && <img src={editPhotoPreview} alt="preview" className="w-14 h-14 rounded-xl object-cover" />}
                      <button type="button" onClick={() => editPhotoRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-[#0f1923] hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors">
                        <Icon name="Upload" size={14} />
                        {editPhotoFile ? editPhotoFile.name : "Изменить фото"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleSaveEdit(artist.id)} disabled={saving} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
                      {saving ? "Сохраняю..." : "Сохранить"}
                    </Button>
                    <Button onClick={() => setEditingId(null)} size="sm" variant="ghost" className="text-slate-400">Отмена</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  {artist.photo_url ? (
                    <img src={artist.photo_url} alt={artist.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#0f1923] flex items-center justify-center shrink-0">
                      <Icon name="Music" size={20} className="text-slate-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white text-sm">{artist.name}</p>
                      {!artist.is_visible && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Скрыт</span>}
                    </div>
                    {artist.url && (
                      <a href={artist.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-[#f5a623] truncate block max-w-[200px] transition-colors">
                        {artist.url}
                      </a>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">порядок: {artist.sort_order}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => startEdit(artist)} className="p-2 text-slate-500 hover:text-[#f5a623] transition-colors">
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button onClick={() => handleDelete(artist.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                      <Icon name="Trash2" size={15} />
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
