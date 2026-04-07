import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface NewsItem {
  id: number;
  title: string;
  body: string;
  image_url: string | null;
  published_at: string;
  is_visible: boolean;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

const ic = "w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#f5a623]/40 transition-colors";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const emptyForm = { title: "", body: "", published_at: "" };
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState({ title: "", body: "", published_at: "", is_visible: true });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.news.adminList();
    setNews(res.news || []);
    setLoading(false);
  };

  const handleImageChange = (file: File, isEdit = false) => {
    const url = URL.createObjectURL(file);
    if (isEdit) { setEditImageFile(file); setEditImagePreview(url); }
    else { setImageFile(file); setImagePreview(url); }
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true); setMsg("");
    const payload: Record<string, unknown> = { title: form.title.trim(), body: form.body.trim() };
    if (form.published_at) payload.published_at = form.published_at;
    if (imageFile) { payload.file_data = await toBase64(imageFile); payload.file_name = imageFile.name; }
    const res = await api.news.add(payload);
    if (res.news) {
      setNews(prev => [res.news, ...prev]);
      setForm(emptyForm); setImageFile(null); setImagePreview(null); setAdding(false);
      setMsg("Новость добавлена");
    } else { setMsg(res.error || "Ошибка"); }
    setSaving(false);
  };

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id);
    const dt = item.published_at ? item.published_at.slice(0, 16) : "";
    setEditForm({ title: item.title, body: item.body, published_at: dt, is_visible: item.is_visible });
    setEditImageFile(null); setEditImagePreview(item.image_url);
  };

  const handleSaveEdit = async (id: number) => {
    setSaving(true); setMsg("");
    const payload: Record<string, unknown> = {
      id,
      title: editForm.title.trim(),
      body: editForm.body.trim(),
      is_visible: editForm.is_visible,
    };
    if (editForm.published_at) payload.published_at = editForm.published_at;
    if (editImageFile) { payload.file_data = await toBase64(editImageFile); payload.file_name = editImageFile.name; }
    const res = await api.news.update(payload);
    if (res.ok) { setEditingId(null); setMsg("Сохранено"); load(); }
    else { setMsg(res.error || "Ошибка"); }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить новость?")) return;
    const res = await api.news.del(id);
    if (res.ok) setNews(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Новости</h3>
          <p className="text-slate-500 text-xs mt-0.5">Публикации на главной странице и странице /news</p>
        </div>
        <Button onClick={() => setAdding(v => !v)} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
          <Icon name="Plus" size={15} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      {msg && <p className="text-green-400 text-sm">{msg}</p>}

      {/* Форма добавления */}
      {adding && (
        <div className="bg-[#1a2636] border border-[#f5a623]/20 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-sm text-[#f5a623]">Новая новость</h4>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Заголовок *" className={ic} />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Текст новости *" rows={5} className={`${ic} resize-none`} />
          <div>
            <p className="text-xs text-slate-400 mb-1">Дата публикации (необязательно)</p>
            <input type="datetime-local" value={form.published_at} onChange={e => setForm({ ...form, published_at: e.target.value })} className={ic} />
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Изображение (необязательно)</p>
            <input ref={imageRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0])} className="hidden" />
            <div className="flex items-center gap-3">
              {imagePreview && <img src={imagePreview} alt="preview" className="w-20 h-14 rounded-lg object-cover" />}
              <button type="button" onClick={() => imageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-[#0f1923] hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors">
                <Icon name="Image" size={14} />
                {imageFile ? imageFile.name : "Выбрать фото"}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={saving || !form.title.trim() || !form.body.trim()} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
              {saving ? "Сохраняю..." : "Опубликовать"}
            </Button>
            <Button onClick={() => { setAdding(false); setImageFile(null); setImagePreview(null); setForm(emptyForm); }} size="sm" variant="ghost" className="text-slate-400">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Загружаю...</div>
      ) : news.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center">Новостей пока нет</div>
      ) : (
        <div className="space-y-3">
          {news.map(item => (
            <div key={item.id} className={`bg-[#1a2636] border rounded-xl p-4 ${editingId === item.id ? "border-[#f5a623]/30" : "border-white/5"}`}>
              {editingId === item.id ? (
                <div className="space-y-3">
                  <input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Заголовок" className={ic} />
                  <textarea value={editForm.body} onChange={e => setEditForm({ ...editForm, body: e.target.value })} placeholder="Текст" rows={5} className={`${ic} resize-none`} />
                  <input type="datetime-local" value={editForm.published_at} onChange={e => setEditForm({ ...editForm, published_at: e.target.value })} className={ic} />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={editForm.is_visible} onChange={e => setEditForm({ ...editForm, is_visible: e.target.checked })} className="accent-[#f5a623]" />
                    <span className="text-sm text-slate-300">Показывать на сайте</span>
                  </label>
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5">Изображение</p>
                    <input ref={editImageRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleImageChange(e.target.files[0], true)} className="hidden" />
                    <div className="flex items-center gap-3">
                      {editImagePreview && <img src={editImagePreview} alt="preview" className="w-20 h-14 rounded-lg object-cover" />}
                      <button type="button" onClick={() => editImageRef.current?.click()} className="flex items-center gap-2 px-3 py-2 bg-[#0f1923] hover:bg-white/10 border border-white/10 rounded-lg text-sm text-slate-300 transition-colors">
                        <Icon name="Image" size={14} />
                        {editImageFile ? editImageFile.name : "Сменить фото"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => handleSaveEdit(item.id)} disabled={saving} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
                      {saving ? "Сохраняю..." : "Сохранить"}
                    </Button>
                    <Button onClick={() => setEditingId(null)} size="sm" variant="ghost" className="text-slate-400">Отмена</Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 items-start">
                  {item.image_url && (
                    <img src={item.image_url} alt={item.title} className="w-16 h-14 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm truncate">{item.title}</p>
                      {!item.is_visible && <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">скрыто</span>}
                    </div>
                    <p className="text-slate-500 text-xs line-clamp-2">{item.body}</p>
                    <p className="text-slate-600 text-xs mt-1">{formatDate(item.published_at)}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(item)} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-red-400/5 transition-colors">
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
