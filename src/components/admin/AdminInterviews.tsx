import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Interview {
  id: number;
  artist_name: string;
  artist_photo_url: string | null;
  question: string;
  answer: string;
  excerpt: string | null;
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
const ta = `${ic} resize-none min-h-[80px]`;

const emptyForm = { artist_name: "", question: "", answer: "", excerpt: "", sort_order: "0" };

export default function AdminInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [editForm, setEditForm] = useState<{ artist_name: string; question: string; answer: string; excerpt: string; sort_order: string; is_visible: boolean }>(
    { artist_name: "", question: "", answer: "", excerpt: "", sort_order: "0", is_visible: true }
  );
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null);
  const editPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const res = await api.beatstore.adminInterviews();
    setInterviews(res.interviews || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!form.artist_name.trim() || !form.question.trim() || !form.answer.trim()) return;
    setSaving(true);
    setMsg("");
    const payload: Record<string, unknown> = {
      artist_name: form.artist_name.trim(),
      question: form.question.trim(),
      answer: form.answer.trim(),
      excerpt: form.excerpt.trim() || undefined,
      sort_order: parseInt(form.sort_order) || 0,
    };
    if (photoFile) {
      payload.file_data = await toBase64(photoFile);
      payload.file_name = photoFile.name;
    }
    const res = await api.beatstore.addInterview(payload);
    if (res.interview) {
      setInterviews(prev => [...prev, res.interview]);
      setForm(emptyForm);
      setPhotoFile(null);
      setPhotoPreview(null);
      setAdding(false);
      setMsg("Интервью добавлено");
    } else {
      setMsg(res.error || "Ошибка");
    }
    setSaving(false);
  };

  const startEdit = (item: Interview) => {
    setEditingId(item.id);
    setEditForm({
      artist_name: item.artist_name,
      question: item.question,
      answer: item.answer,
      excerpt: item.excerpt || "",
      sort_order: String(item.sort_order),
      is_visible: item.is_visible,
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(item.artist_photo_url);
  };

  const handleSaveEdit = async (id: number) => {
    setSaving(true);
    setMsg("");
    const payload: Record<string, unknown> = {
      id,
      artist_name: editForm.artist_name.trim(),
      question: editForm.question.trim(),
      answer: editForm.answer.trim(),
      excerpt: editForm.excerpt.trim() || null,
      sort_order: parseInt(editForm.sort_order) || 0,
      is_visible: editForm.is_visible,
    };
    if (editPhotoFile) {
      payload.file_data = await toBase64(editPhotoFile);
      payload.file_name = editPhotoFile.name;
    }
    const res = await api.beatstore.updateInterview(payload);
    if (res.ok) {
      setInterviews(prev => prev.map(i => i.id === id ? {
        ...i, ...editForm,
        sort_order: parseInt(editForm.sort_order) || 0,
        artist_photo_url: editPhotoFile ? editPhotoPreview : i.artist_photo_url,
      } : i));
      setEditingId(null);
      setMsg("Сохранено");
      load();
    } else {
      setMsg(res.error || "Ошибка сохранения");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить интервью?")) return;
    const res = await api.beatstore.delInterview(id);
    if (res.ok) setInterviews(prev => prev.filter(i => i.id !== id));
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
          <h3 className="font-semibold text-lg">Интервью артистов</h3>
          <p className="text-slate-500 text-xs mt-0.5">Блок «Интервью лучших артистов лейбла» на главной странице</p>
        </div>
        <Button onClick={() => setAdding(v => !v)} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
          <Icon name="MessageSquarePlus" size={15} className="mr-1.5" />
          Добавить
        </Button>
      </div>

      {msg && <p className="text-green-400 text-sm">{msg}</p>}

      {adding && (
        <div className="bg-[#1a2636] border border-[#f5a623]/20 rounded-2xl p-4 space-y-3">
          <h4 className="font-semibold text-sm text-[#f5a623]">Новое интервью</h4>
          <input value={form.artist_name} onChange={e => setForm({ ...form, artist_name: e.target.value })} placeholder="Имя артиста *" className={ic} />
          <input value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} placeholder="Вопрос *" className={ic} />
          <textarea value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} placeholder="Ответ артиста *" className={ta} />
          <textarea value={form.excerpt} onChange={e => setForm({ ...form, excerpt: e.target.value })} placeholder="Короткая цитата для превью (необязательно)" className={`${ic} resize-none`} />
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
            <Button onClick={handleAdd} disabled={saving || !form.artist_name.trim() || !form.question.trim() || !form.answer.trim()} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
              {saving ? "Сохраняю..." : "Добавить"}
            </Button>
            <Button onClick={() => { setAdding(false); setPhotoFile(null); setPhotoPreview(null); setForm(emptyForm); }} size="sm" variant="ghost" className="text-slate-400">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">Загружаю...</div>
      ) : interviews.length === 0 ? (
        <div className="text-slate-500 text-sm py-8 text-center">Интервью пока нет</div>
      ) : (
        <div className="space-y-2">
          {interviews.map(item => (
            <div key={item.id} className={`bg-[#1a2636] border rounded-xl p-4 ${editingId === item.id ? "border-[#f5a623]/30" : "border-white/5"}`}>
              {editingId === item.id ? (
                <div className="space-y-3">
                  <input value={editForm.artist_name} onChange={e => setEditForm({ ...editForm, artist_name: e.target.value })} placeholder="Имя артиста" className={ic} />
                  <input value={editForm.question} onChange={e => setEditForm({ ...editForm, question: e.target.value })} placeholder="Вопрос" className={ic} />
                  <textarea value={editForm.answer} onChange={e => setEditForm({ ...editForm, answer: e.target.value })} placeholder="Ответ" className={ta} />
                  <textarea value={editForm.excerpt} onChange={e => setEditForm({ ...editForm, excerpt: e.target.value })} placeholder="Короткая цитата" className={`${ic} resize-none`} />
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
                        {editPhotoFile ? editPhotoFile.name : "Заменить фото"}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={() => handleSaveEdit(item.id)} disabled={saving} size="sm" className="bg-[#f5a623] hover:bg-[#f5a623]/80 text-black font-semibold">
                      {saving ? "Сохраняю..." : "Сохранить"}
                    </Button>
                    <Button onClick={() => setEditingId(null)} size="sm" variant="ghost" className="text-slate-400">
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#0f1923] shrink-0">
                    {item.artist_photo_url ? (
                      <img src={item.artist_photo_url} alt={item.artist_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="Mic2" size={18} className="text-slate-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-white">{item.artist_name}</p>
                      {!item.is_visible && <span className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">скрыто</span>}
                    </div>
                    <p className="text-slate-400 text-xs mt-1 line-clamp-1">{item.question}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(item)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
                      <Icon name="Pencil" size={14} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
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
