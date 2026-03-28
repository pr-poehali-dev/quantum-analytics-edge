import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Release {
  id: number; title: string; artist_name: string; upc: string | null;
  cover_url: string | null; status: string; genre: string | null;
  release_date: string | null; notes: string | null; label?: string; type?: string;
}

interface Props {
  onCreated: (release: Release) => void;
  onCancel: () => void;
  userArtistName?: string;
}

type Step = "release" | "tracklist" | "platforms" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "release", label: "Релиз" },
  { key: "tracklist", label: "Трек-лист" },
  { key: "platforms", label: "Площадки" },
  { key: "review", label: "Проверка" },
];

const GENRES = ["Pop", "Hip-Hop", "Trap", "R&B", "Rock", "Electronic", "Jazz", "Classical", "Folk", "Reggae", "Другой"];
const LANGUAGES = ["Русский", "English", "Español", "Deutsch", "Français", "Другой"];
const ALL_PLATFORMS = ["Spotify", "Apple Music", "VK Музыка", "Яндекс Музыка", "YouTube Music", "Deezer", "Tidal", "Amazon Music", "SoundCloud"];

const SIDEBAR_SECTIONS = [
  { step: "release" as Step,    label: "Основная информация" },
  { step: "release" as Step,    label: "Персоны и роли" },
  { step: "release" as Step,    label: "Жанр и поджанр" },
  { step: "tracklist" as Step,  label: "Идентификация" },
  { step: "tracklist" as Step,  label: "Название лейбла" },
  { step: "platforms" as Step,  label: "Даты" },
  { step: "platforms" as Step,  label: "Площадки и территории" },
  { step: "review" as Step,     label: "Загрузка видео" },
  { step: "review" as Step,     label: "Сопроводительные материалы" },
];

export default function NewReleaseForm({ onCreated, onCancel, userArtistName }: Props) {
  const [step, setStep] = useState<Step>("release");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    artist_name: userArtistName || "",
    type: "Single" as "Single" | "EP" | "Album",
    language: "Русский",
    genre: "",
    subgenre: "",
    label: "",
    upc: "",
    release_date: "",
    notes: "",
    copyright: "",
    platforms: [] as string[],
    lyrics: "",
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [trackFiles, setTrackFiles] = useState<File[]>([]);
  const coverRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const togglePlatform = (p: string) => {
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p],
    }));
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !coverFile) {
      setError("Заполните название и загрузите обложку");
      return;
    }
    setSaving(true);
    setError("");
    const formData = new FormData();
    formData.append("file", coverFile);
    const coverRes = await fetch(
      "https://functions.poehali.dev/afedf9ee-5782-4eee-8e0d-b7416b479bf2?action=upload-cover",
      { method: "POST", headers: { "X-Session-Token": localStorage.getItem("ks_token") || "" }, body: formData }
    );
    const coverData = await coverRes.json();
    if (!coverData.cover_url) {
      setError("Ошибка загрузки обложки");
      setSaving(false);
      return;
    }
    const res = await api.releases.create({
      title: form.title,
      artist_name: form.artist_name,
      upc: form.upc || undefined,
      genre: form.genre || undefined,
      release_date: form.release_date || undefined,
      notes: [form.notes, form.copyright, form.platforms.join(", "), form.lyrics].filter(Boolean).join("\n---\n") || undefined,
      cover_url: coverData.cover_url,
    });
    if (res.release) {
      onCreated(res.release);
    } else {
      setError(res.error || "Ошибка создания релиза");
    }
    setSaving(false);
  };

  const canNext = () => {
    if (step === "release") return form.title.trim().length > 0 && form.artist_name.trim().length > 0;
    return true;
  };

  const next = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].key);
  };

  const prev = () => {
    const idx = STEPS.findIndex(s => s.key === step);
    if (idx > 0) setStep(STEPS[idx - 1].key);
  };

  const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls = "bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600 focus:border-[#f5a623]/40";
  const selectCls = "w-full bg-[#0f1923] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#f5a623]/40 transition-colors";

  return (
    <div className="flex flex-col h-full">

      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <h2 className="text-xl font-bold">Новый релиз</h2>
      </div>

      {/* Табы — как на макете: рамка вокруг, активная вкладка выделена */}
      <div className="flex mb-5 border border-white/10 rounded-xl overflow-hidden">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { if (i <= stepIndex || canNext()) setStep(s.key); }}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              step === s.key
                ? "bg-[#1a2636] text-white border-r border-white/10 last:border-r-0"
                : i < stepIndex
                ? "text-slate-400 hover:text-white hover:bg-white/5 border-r border-white/10 last:border-r-0"
                : "text-slate-600 border-r border-white/10 last:border-r-0"
            }`}
          >
            {step === s.key && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f5a623] mr-1.5 mb-0.5" />
            )}
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Основной контент ── */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-1 space-y-4">

          {/* ШАГ 1: РЕЛИЗ */}
          {step === "release" && (
            <>
              <div className="mb-1">
                <h3 className="font-semibold text-base">Работа с релизом</h3>
                <p className="text-slate-500 text-xs mt-0.5">Заполните общую информацию по релизу</p>
              </div>

              {/* Основная информация */}
              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Основная информация</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Заполните общую информацию по вашему релизу</p>
                </div>
                <Field label="Язык метаданных">
                  <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className={selectCls}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Название релиза" required>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Введите название" className={inputCls} />
                  </Field>
                  <Field label="Подзаголовок">
                    <Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Введите подзаголовок" className={inputCls} />
                  </Field>
                </div>
                <Field label="Тип релиза">
                  <div className="flex flex-col gap-2 mt-0.5">
                    {(["Single", "EP", "Album"] as const).map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="type" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} className="accent-[#f5a623]" />
                        <span className="text-sm text-slate-300">{t}</span>
                      </label>
                    ))}
                  </div>
                </Field>
              </section>

              {/* Персоны и роли */}
              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-semibold text-sm">Персоны и роли</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Укажите исполнителя</p>
                </div>
                <Field label="Исполнитель" required>
                  <Input value={form.artist_name} onChange={e => setForm({ ...form, artist_name: e.target.value })} placeholder="Имя артиста" className={inputCls} />
                </Field>
              </section>

              {/* Жанр */}
              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Жанр и поджанр</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Жанр">
                    <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className={selectCls}>
                      <option value="">Выберите жанр</option>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Поджанр">
                    <Input value={form.subgenre} onChange={e => setForm({ ...form, subgenre: e.target.value })} placeholder="Поджанр" className={inputCls} />
                  </Field>
                </div>
              </section>
            </>
          )}

          {/* ШАГ 2: ТРЕК-ЛИСТ */}
          {step === "tracklist" && (
            <>
              <div className="mb-1">
                <h3 className="font-semibold text-base">Трек-лист</h3>
                <p className="text-slate-500 text-xs mt-0.5">Загрузите треки и заполните метаданные</p>
              </div>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Обложка <span className="text-red-400">*</span></h4>
                <div className="flex items-start gap-4">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Обложка" className="w-24 h-24 rounded-xl object-cover border border-white/10 shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-[#0f1923] border border-dashed border-white/20 flex flex-col items-center justify-center shrink-0">
                      <Icon name="Image" size={24} className="text-slate-600 mb-1" />
                      <span className="text-xs text-slate-600">3000×3000</span>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">Минимум 3000×3000 px, JPEG или PNG</p>
                    <input ref={coverRef} type="file" accept=".jpg,.jpeg,.png" onChange={handleCoverChange} className="hidden" />
                    <Button size="sm" variant="outline" onClick={() => coverRef.current?.click()} className="border-white/20 text-white hover:bg-white/10 text-xs">
                      <Icon name="Upload" size={13} className="mr-1.5" />
                      {coverFile ? coverFile.name.slice(0, 20) + "…" : "Выбрать файл"}
                    </Button>
                  </div>
                </div>
              </section>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Аудиофайлы</h4>
                <p className="text-xs text-slate-400">WAV, 16 bit, 44.1 kHz, Stereo</p>
                <input ref={trackRef} type="file" accept="audio/*" multiple onChange={e => setTrackFiles(prev => [...prev, ...Array.from(e.target.files || [])])} className="hidden" />
                {trackFiles.length > 0 && (
                  <div className="space-y-2">
                    {trackFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-[#0f1923] rounded-lg px-3 py-2.5">
                        <Icon name="Music" size={14} className="text-[#f5a623] shrink-0" />
                        <span className="text-sm text-slate-300 flex-1 truncate">{f.name}</span>
                        <button onClick={() => setTrackFiles(prev => prev.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400">
                          <Icon name="X" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <Button size="sm" variant="outline" onClick={() => trackRef.current?.click()} className="border-white/20 text-white hover:bg-white/10">
                  <Icon name="Plus" size={14} className="mr-1.5" />
                  Добавить трек
                </Button>
              </section>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Идентификация</h4>
                <Field label="UPC / EAN (если есть)">
                  <Input value={form.upc} onChange={e => setForm({ ...form, upc: e.target.value })} placeholder="Оставьте пустым для автогенерации" className={inputCls} />
                </Field>
                <Field label="Название лейбла">
                  <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="KS Label" className={inputCls} />
                </Field>
              </section>
            </>
          )}

          {/* ШАГ 3: ПЛОЩАДКИ */}
          {step === "platforms" && (
            <>
              <div className="mb-1">
                <h3 className="font-semibold text-base">Площадки и даты</h3>
                <p className="text-slate-500 text-xs mt-0.5">Выберите где разместить релиз</p>
              </div>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Даты</h4>
                <Field label="Дата релиза">
                  <Input type="date" value={form.release_date} onChange={e => setForm({ ...form, release_date: e.target.value })} className={inputCls} />
                </Field>
              </section>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Площадки и территории</h4>
                  <button
                    onClick={() => setForm(f => ({ ...f, platforms: f.platforms.length === ALL_PLATFORMS.length ? [] : [...ALL_PLATFORMS] }))}
                    className="text-xs text-[#f5a623] hover:opacity-80 transition-opacity"
                  >
                    {form.platforms.length === ALL_PLATFORMS.length ? "Снять все" : "Выбрать все"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PLATFORMS.map(p => (
                    <label key={p} className="flex items-center gap-2.5 cursor-pointer group">
                      <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => togglePlatform(p)} className="accent-[#f5a623]" />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{p}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Сопроводительные материалы</h4>
                <Field label="Правообладатель / Copyright">
                  <Input value={form.copyright} onChange={e => setForm({ ...form, copyright: e.target.value })} placeholder="© 2025 KS Label" className={inputCls} />
                </Field>
                <Field label="Текст трека (необязательно)">
                  <textarea
                    value={form.lyrics}
                    onChange={e => setForm({ ...form, lyrics: e.target.value })}
                    placeholder="Текст песни..."
                    rows={5}
                    className="w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2.5 text-sm resize-none outline-none focus:border-[#f5a623]/40 transition-colors"
                  />
                </Field>
              </section>
            </>
          )}

          {/* ШАГ 4: ПРОВЕРКА */}
          {step === "review" && (
            <>
              <div className="mb-1">
                <h3 className="font-semibold text-base">Проверка</h3>
                <p className="text-slate-500 text-xs mt-0.5">Убедитесь что всё верно перед отправкой</p>
              </div>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-start gap-4">
                  {coverPreview ? (
                    <img src={coverPreview} alt="Обложка" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-[#0f1923] flex items-center justify-center shrink-0">
                      <Icon name="Music" size={24} className="text-slate-600" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg">{form.title || "—"}</p>
                    <p className="text-[#f5a623] text-sm">{form.artist_name || "—"}</p>
                    <p className="text-slate-500 text-xs mt-1">{form.type} · {form.genre || "Жанр не указан"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
                  {[
                    { label: "Лейбл", value: form.label || "Не указан" },
                    { label: "Дата релиза", value: form.release_date || "Не указана" },
                    { label: "UPC", value: form.upc || "Автогенерация" },
                    { label: "Язык", value: form.language },
                    { label: "Треки", value: trackFiles.length > 0 ? `${trackFiles.length} файл(ов)` : "Не загружены" },
                    { label: "Площадки", value: form.platforms.length > 0 ? `${form.platforms.length} выбрано` : "Не выбраны" },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm text-white mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
                {form.platforms.length > 0 && (
                  <div className="pt-3 border-t border-white/10">
                    <p className="text-xs text-slate-500 mb-2">Площадки</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.platforms.map(p => (
                        <span key={p} className="text-xs bg-[#f5a623]/10 text-[#f5a623] px-2 py-1 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-2.5">
                <h4 className="font-semibold text-sm mb-3">Чеклист</h4>
                {[
                  { ok: !!form.title.trim(), label: "Название релиза" },
                  { ok: !!form.artist_name.trim(), label: "Исполнитель" },
                  { ok: !!coverFile, label: "Обложка загружена" },
                  { ok: !!form.genre, label: "Жанр выбран" },
                  { ok: form.platforms.length > 0, label: "Площадки выбраны" },
                  { ok: !!form.release_date, label: "Дата релиза указана" },
                ].map(({ ok, label }) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${ok ? "bg-[#f5a623]/20 border-[#f5a623]/40" : "border-white/15"}`}>
                      {ok && <Icon name="Check" size={10} className="text-[#f5a623]" />}
                    </div>
                    <span className={`text-sm ${ok ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
                  </div>
                ))}
              </section>

              {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            </>
          )}

          {/* Кнопки навигации */}
          <div className="flex items-center justify-between pt-2 pb-4">
            <Button
              variant="outline"
              onClick={stepIndex === 0 ? onCancel : prev}
              className="border-white/15 text-slate-300 hover:bg-white/5"
            >
              {stepIndex === 0 ? "Отмена" : "← Назад"}
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canNext()} className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold">
                Далее →
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving} className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold">
                {saving ? "Отправка..." : "Отправить на модерацию"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Боковой чеклист (как на макете) ── */}
        <div className="hidden lg:block w-48 shrink-0">
          <div className="sticky top-0 space-y-1">
            {SIDEBAR_SECTIONS.map((item, i) => {
              const itemStepIndex = STEPS.findIndex(s => s.key === item.step);
              const isDone = itemStepIndex < stepIndex;
              const isActive = item.step === step;
              return (
                <div key={i} className="flex items-center gap-2 py-1">
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                    isDone
                      ? "bg-[#f5a623]/20 border-[#f5a623]/50"
                      : isActive
                      ? "border-[#f5a623]/60"
                      : "border-white/15"
                  }`}>
                    {isDone && <Icon name="Check" size={8} className="text-[#f5a623]" />}
                  </div>
                  <span className={`text-xs leading-tight transition-colors ${
                    isActive ? "text-[#f5a623] font-medium" :
                    isDone ? "text-slate-400" :
                    "text-slate-600"
                  }`}>
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
