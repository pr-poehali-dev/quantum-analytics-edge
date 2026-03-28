import { useState, useRef, useCallback } from "react";
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
  { key: "release",   label: "Релиз" },
  { key: "tracklist", label: "Трек-лист" },
  { key: "platforms", label: "Площадки" },
  { key: "review",    label: "Проверка" },
];

const GENRES = ["Pop", "Hip-Hop", "Trap", "R&B", "Rock", "Electronic", "Jazz", "Classical", "Folk", "Reggae", "Другой"];
const LANGUAGES = ["Русский", "English", "Español", "Deutsch", "Français", "Другой"];
const ALL_PLATFORMS = ["Spotify", "Apple Music", "VK Музыка", "Яндекс Музыка", "YouTube Music", "Deezer", "Tidal", "Amazon Music", "SoundCloud"];

const SIDEBAR_SECTIONS: { step: Step; label: string; section: string }[] = [
  { step: "release",   label: "Основная информация", section: "main" },
  { step: "release",   label: "Персоны и роли",       section: "persons" },
  { step: "release",   label: "Жанр и поджанр",       section: "genre" },
  { step: "tracklist", label: "Обложка",               section: "cover" },
  { step: "tracklist", label: "Аудиофайлы",            section: "audio" },
  { step: "tracklist", label: "Идентификация",         section: "ident" },
  { step: "platforms", label: "Даты",                  section: "dates" },
  { step: "platforms", label: "Площадки и территории", section: "places" },
  { step: "platforms", label: "Сопроводит. материалы", section: "accomp" },
  { step: "review",    label: "Проверка и отправка",   section: "final" },
];

function fmtSize(bytes: number) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " КБ";
  return (bytes / 1024 / 1024).toFixed(1) + " МБ";
}

export default function NewReleaseForm({ onCreated, onCancel, userArtistName }: Props) {
  const [step, setStep] = useState<Step>("release");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [coverDrag, setCoverDrag] = useState(false);
  const [audioDrag, setAudioDrag] = useState(false);

  const [form, setForm] = useState({
    title: "", subtitle: "", artist_name: userArtistName || "",
    type: "Single" as "Single" | "EP" | "Album",
    language: "Русский", genre: "", subgenre: "",
    label: "", upc: "", release_date: "", notes: "", copyright: "",
    platforms: [] as string[], lyrics: "",
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [trackFiles, setTrackFiles] = useState<File[]>([]);
  const coverRef = useRef<HTMLInputElement>(null);
  const trackRef  = useRef<HTMLInputElement>(null);

  // ─── Секции для скролла ───
  const sectionRefs: Record<string, React.RefObject<HTMLElement>> = {
    main:    useRef<HTMLElement>(null),
    persons: useRef<HTMLElement>(null),
    genre:   useRef<HTMLElement>(null),
    cover:   useRef<HTMLElement>(null),
    audio:   useRef<HTMLElement>(null),
    ident:   useRef<HTMLElement>(null),
    dates:   useRef<HTMLElement>(null),
    places:  useRef<HTMLElement>(null),
    accomp:  useRef<HTMLElement>(null),
    final:   useRef<HTMLElement>(null),
  };
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const goToSection = (item: typeof SIDEBAR_SECTIONS[0]) => {
    setStep(item.step);
    setTimeout(() => {
      const ref = sectionRefs[item.section];
      if (ref?.current) ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const togglePlatform = (p: string) =>
    setForm(f => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter(x => x !== p) : [...f.platforms, p] }));

  // ─── Обложка ───
  const applyCover = (file: File) => {
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = () => setCoverPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const onCoverDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setCoverDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) applyCover(file);
  }, []);

  // ─── Аудио ───
  const addAudioFiles = (files: FileList | null) => {
    if (!files) return;
    setTrackFiles(prev => [...prev, ...Array.from(files)]);
  };

  const onAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setAudioDrag(false);
    addAudioFiles(e.dataTransfer.files);
  }, []);

  // ─── Валидация ───
  const canGoTo = (targetIdx: number) => targetIdx <= stepIndex + 1;

  const canNext = () => {
    if (step === "release") return form.title.trim().length > 0 && form.artist_name.trim().length > 0;
    return true;
  };

  const next = () => { const i = stepIndex; if (i < STEPS.length - 1) setStep(STEPS[i + 1].key); };
  const prev = () => { const i = stepIndex; if (i > 0) setStep(STEPS[i - 1].key); };

  // ─── Сабмит ───
  const handleSubmit = async () => {
    if (!form.title.trim() || !coverFile) { setError("Заполните название и загрузите обложку"); return; }
    setSaving(true); setError("");
    const formData = new FormData();
    formData.append("file", coverFile);
    const coverRes = await fetch(
      "https://functions.poehali.dev/afedf9ee-5782-4eee-8e0d-b7416b479bf2?action=upload-cover",
      { method: "POST", headers: { "X-Session-Token": localStorage.getItem("ks_token") || "" }, body: formData }
    );
    const coverData = await coverRes.json();
    if (!coverData.cover_url) { setError("Ошибка загрузки обложки"); setSaving(false); return; }

    const res = await api.releases.create({
      title: form.title, artist_name: form.artist_name,
      upc: form.upc || undefined, genre: form.genre || undefined,
      release_date: form.release_date || undefined,
      notes: [form.notes, form.copyright, form.platforms.join(", "), form.lyrics].filter(Boolean).join("\n---\n") || undefined,
      cover_url: coverData.cover_url,
      type: form.type, label: form.label || undefined,
    });
    if (res.release) onCreated(res.release);
    else setError(res.error || "Ошибка создания релиза");
    setSaving(false);
  };

  // ─── Хелперы UI ───
  const F = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
  const ic = "bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600 focus:border-[#f5a623]/40";
  const sc = "w-full bg-[#0f1923] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#f5a623]/40 transition-colors";

  return (
    <div className="flex flex-col h-full">

      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <h2 className="text-xl font-bold">Новый релиз</h2>
      </div>

      {/* Табы */}
      <div className="flex mb-5 border border-white/10 rounded-xl overflow-hidden">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { if (canGoTo(i)) setStep(s.key); }}
            disabled={!canGoTo(i)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors border-r border-white/10 last:border-r-0 ${
              step === s.key
                ? "bg-[#1a2636] text-white"
                : i < stepIndex
                ? "text-[#f5a623] hover:bg-white/5 cursor-pointer"
                : i === stepIndex + 1 && canNext()
                ? "text-slate-400 hover:bg-white/5 cursor-pointer"
                : "text-slate-600 cursor-not-allowed"
            }`}
          >
            {i < stepIndex && <Icon name="Check" size={12} className="inline mr-1 mb-0.5 text-[#f5a623]" />}
            {step === s.key && <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f5a623] mr-1.5 mb-0.5" />}
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Основной контент ── */}
        <div ref={scrollAreaRef} className="flex-1 min-w-0 overflow-y-auto pr-1 space-y-4">

          {/* ШАГ 1: РЕЛИЗ */}
          {step === "release" && (
            <>
              <div><h3 className="font-semibold text-base">Работа с релизом</h3><p className="text-slate-500 text-xs mt-0.5">Заполните общую информацию по релизу</p></div>

              <section ref={sectionRefs.main} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div><h4 className="font-semibold text-sm">Основная информация</h4><p className="text-slate-500 text-xs mt-0.5">Заполните общую информацию по вашему релизу</p></div>
                <F label="Язык метаданных">
                  <select value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} className={sc}>
                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                  </select>
                </F>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Название релиза" required>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Введите название" className={ic} />
                  </F>
                  <F label="Подзаголовок">
                    <Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} placeholder="Введите подзаголовок" className={ic} />
                  </F>
                </div>
                <F label="Тип релиза">
                  <div className="flex gap-5 mt-0.5">
                    {(["Single", "EP", "Album"] as const).map(t => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="rtype" value={t} checked={form.type === t} onChange={() => setForm({ ...form, type: t })} className="accent-[#f5a623]" />
                        <span className="text-sm text-slate-300">{t}</span>
                      </label>
                    ))}
                  </div>
                </F>
              </section>

              <section ref={sectionRefs.persons} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div><h4 className="font-semibold text-sm">Персоны и роли</h4><p className="text-slate-500 text-xs mt-0.5">Укажите исполнителя</p></div>
                <F label="Исполнитель" required>
                  <Input value={form.artist_name} onChange={e => setForm({ ...form, artist_name: e.target.value })} placeholder="Имя артиста" className={ic} />
                </F>
              </section>

              <section ref={sectionRefs.genre} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Жанр и поджанр</h4>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Жанр">
                    <select value={form.genre} onChange={e => setForm({ ...form, genre: e.target.value })} className={sc}>
                      <option value="">Выберите жанр</option>
                      {GENRES.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </F>
                  <F label="Поджанр">
                    <Input value={form.subgenre} onChange={e => setForm({ ...form, subgenre: e.target.value })} placeholder="Поджанр" className={ic} />
                  </F>
                </div>
              </section>
            </>
          )}

          {/* ШАГ 2: ТРЕК-ЛИСТ */}
          {step === "tracklist" && (
            <>
              <div><h3 className="font-semibold text-base">Трек-лист</h3><p className="text-slate-500 text-xs mt-0.5">Загрузите обложку и аудиофайлы</p></div>

              {/* Обложка с drag & drop */}
              <section ref={sectionRefs.cover} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Обложка <span className="text-red-400">*</span></h4>
                  {coverFile && (
                    <button onClick={() => { setCoverFile(null); setCoverPreview(null); }} className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1">
                      <Icon name="X" size={12} /> Удалить
                    </button>
                  )}
                </div>
                <input ref={coverRef} type="file" accept=".jpg,.jpeg,.png" onChange={e => e.target.files?.[0] && applyCover(e.target.files[0])} className="hidden" />
                <div
                  onClick={() => !coverFile && coverRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setCoverDrag(true); }}
                  onDragLeave={() => setCoverDrag(false)}
                  onDrop={onCoverDrop}
                  className={`relative rounded-xl border-2 border-dashed transition-all ${
                    coverDrag ? "border-[#f5a623] bg-[#f5a623]/5" :
                    coverFile ? "border-white/10" : "border-white/15 hover:border-white/25 cursor-pointer"
                  }`}
                >
                  {coverPreview ? (
                    <div className="flex items-center gap-4 p-4">
                      <img src={coverPreview} alt="cover" className="w-20 h-20 rounded-lg object-cover shrink-0" />
                      <div>
                        <p className="text-sm text-white font-medium truncate max-w-[200px]">{coverFile?.name}</p>
                        <p className="text-xs text-slate-500 mt-1">{coverFile && fmtSize(coverFile.size)}</p>
                        <button
                          onClick={e => { e.stopPropagation(); coverRef.current?.click(); }}
                          className="mt-2 text-xs text-[#f5a623] hover:opacity-80 transition-opacity"
                        >Заменить файл</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                      <div className="w-12 h-12 rounded-xl bg-[#0f1923] flex items-center justify-center mb-3">
                        <Icon name="Image" size={24} className="text-slate-500" />
                      </div>
                      <p className="text-sm text-slate-300 font-medium">Перетащи файл или нажми для выбора</p>
                      <p className="text-xs text-slate-500 mt-1">JPEG или PNG, минимум 3000×3000 px</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Аудиофайлы с drag & drop */}
              <section ref={sectionRefs.audio} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Аудиофайлы</h4>
                <input ref={trackRef} type="file" accept="audio/*" multiple onChange={e => addAudioFiles(e.target.files)} className="hidden" />

                {/* Зона drag & drop */}
                <div
                  onClick={() => trackRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setAudioDrag(true); }}
                  onDragLeave={() => setAudioDrag(false)}
                  onDrop={onAudioDrop}
                  className={`rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center py-6 px-4 text-center ${
                    audioDrag ? "border-[#f5a623] bg-[#f5a623]/5" : "border-white/15 hover:border-white/25"
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0f1923] flex items-center justify-center mb-2">
                    <Icon name="Upload" size={20} className="text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-300 font-medium">Перетащи аудиофайлы или нажми</p>
                  <p className="text-xs text-slate-500 mt-1">WAV · 16 bit · 44.1 kHz · Stereo</p>
                </div>

                {/* Список файлов */}
                {trackFiles.length > 0 && (
                  <div className="space-y-2">
                    {trackFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-3 bg-[#0f1923] rounded-xl px-4 py-3 group">
                        <div className="w-8 h-8 rounded-lg bg-[#f5a623]/10 flex items-center justify-center shrink-0">
                          <Icon name="Music2" size={15} className="text-[#f5a623]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{f.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{fmtSize(f.size)}</p>
                        </div>
                        <button
                          onClick={() => setTrackFiles(prev => prev.filter((_, j) => j !== i))}
                          className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Icon name="Trash2" size={15} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => trackRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-2 text-xs text-slate-400 hover:text-white transition-colors border border-dashed border-white/10 rounded-xl hover:border-white/20"
                    >
                      <Icon name="Plus" size={13} /> Добавить ещё трек
                    </button>
                  </div>
                )}
              </section>

              <section ref={sectionRefs.ident} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Идентификация</h4>
                <F label="UPC / EAN (если есть)">
                  <Input value={form.upc} onChange={e => setForm({ ...form, upc: e.target.value })} placeholder="Оставьте пустым для автогенерации" className={ic} />
                </F>
                <F label="Название лейбла">
                  <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="KS Label" className={ic} />
                </F>
              </section>
            </>
          )}

          {/* ШАГ 3: ПЛОЩАДКИ */}
          {step === "platforms" && (
            <>
              <div><h3 className="font-semibold text-base">Площадки и даты</h3><p className="text-slate-500 text-xs mt-0.5">Выберите где и когда разместить релиз</p></div>

              <section ref={sectionRefs.dates} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Даты</h4>
                <F label="Дата релиза">
                  <Input type="date" value={form.release_date} onChange={e => setForm({ ...form, release_date: e.target.value })} className={ic} />
                </F>
              </section>

              <section ref={sectionRefs.places} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
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
                    <label key={p} className={`flex items-center gap-2.5 cursor-pointer px-3 py-2 rounded-lg border transition-colors ${
                      form.platforms.includes(p) ? "border-[#f5a623]/30 bg-[#f5a623]/5" : "border-white/5 hover:border-white/15"
                    }`}>
                      <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => togglePlatform(p)} className="accent-[#f5a623]" />
                      <span className="text-sm text-slate-300">{p}</span>
                    </label>
                  ))}
                </div>
              </section>

              <section ref={sectionRefs.accomp} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Сопроводительные материалы</h4>
                <F label="Правообладатель / Copyright">
                  <Input value={form.copyright} onChange={e => setForm({ ...form, copyright: e.target.value })} placeholder="© 2025 KS Label" className={ic} />
                </F>
                <F label="Текст трека (необязательно)">
                  <textarea
                    value={form.lyrics} onChange={e => setForm({ ...form, lyrics: e.target.value })}
                    placeholder="Текст песни..." rows={5}
                    className="w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2.5 text-sm resize-none outline-none focus:border-[#f5a623]/40 transition-colors"
                  />
                </F>
              </section>
            </>
          )}

          {/* ШАГ 4: ПРОВЕРКА */}
          {step === "review" && (
            <>
              {/* ── Информация ── */}
              <section ref={sectionRefs.final} className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-5">
                <h3 className="font-bold text-lg">Информация</h3>

                {/* Обложка + название */}
                <div className="flex items-center gap-4">
                  {coverPreview
                    ? <img src={coverPreview} alt="cover" className="w-20 h-20 rounded-xl object-cover shrink-0" />
                    : <div className="w-20 h-20 rounded-xl bg-[#0f1923] border border-white/10 flex items-center justify-center shrink-0"><Icon name="Music2" size={28} className="text-slate-600" /></div>
                  }
                  <div>
                    <p className="font-bold text-xl leading-tight">{form.title || "—"}</p>
                    <p className="text-slate-400 text-base mt-0.5">{form.artist_name || "—"}</p>
                  </div>
                </div>

                {/* Тип / Жанр / Язык */}
                <div className="flex gap-6 pt-1">
                  {[
                    { label: "Тип",           value: form.type },
                    { label: "Жанр",          value: form.genre || "—" },
                    { label: "Язык названия", value: form.language },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                      <p className="text-sm font-medium text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="h-px bg-white/5" />

                {/* Лейбл / UPC */}
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Лейбл / копирайт</p>
                    <p className="text-sm font-medium text-white">{form.label || form.copyright || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">UPC</p>
                    <p className="text-sm font-medium text-white">{form.upc || "Автоматически"}</p>
                  </div>
                </div>

                {/* Дата */}
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Оригинальная дата релиза</p>
                  <p className="text-sm font-medium text-white">
                    {form.release_date
                      ? new Date(form.release_date).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" })
                      : "Автоматически"}
                  </p>
                </div>
              </section>

              {/* ── Участники ── */}
              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-lg">Участники</h3>
                <div className="space-y-3">
                  {[
                    { name: form.artist_name || "—", role: "Основной" },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#0f1923] border border-white/10 flex items-center justify-center shrink-0">
                        <Icon name="User" size={20} className="text-slate-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-white">{p.name}</span>
                        <span className="text-sm text-slate-500 ml-2">{p.role}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── Треклист ── */}
              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-lg">Треклист</h3>
                {trackFiles.length === 0 ? (
                  <div className="flex items-center gap-3 py-2">
                    <div className="w-10 h-10 rounded-full bg-[#0f1923] flex items-center justify-center shrink-0">
                      <Icon name="Music2" size={16} className="text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm">Треки не добавлены</p>
                    <button onClick={() => setStep("tracklist")} className="ml-auto text-xs text-[#f5a623] hover:opacity-80">Добавить →</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trackFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm text-slate-500 w-5 shrink-0">{i + 1}.</span>
                        <div className="w-10 h-10 rounded-full bg-[#f5a623]/20 flex items-center justify-center shrink-0">
                          <Icon name="Play" size={14} className="text-[#f5a623] ml-0.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {f.name.replace(/\.[^.]+$/, "")}
                          </p>
                          <p className="text-xs text-slate-500">{form.artist_name || "—"}</p>
                        </div>
                        <Icon name="ChevronDown" size={16} className="text-slate-500 shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Настройки ── */}
              <section className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h3 className="font-bold text-lg">Настройки</h3>
                <div className="flex gap-8">
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Площадки</p>
                    <p className="text-sm font-medium text-white">
                      {form.platforms.length === 0 ? "—" : form.platforms.length === ALL_PLATFORMS.length ? "Все" : `${form.platforms.length} выбрано`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Страны</p>
                    <p className="text-sm font-medium text-white">Все</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-0.5">Дата релиза</p>
                    <p className="text-sm font-medium text-white">
                      {form.release_date
                        ? new Date(form.release_date).toLocaleDateString("ru", { day: "2-digit", month: "2-digit", year: "numeric" })
                        : "Автоматически"}
                    </p>
                  </div>
                </div>

                {form.platforms.length > 0 && form.platforms.length < ALL_PLATFORMS.length && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                    {form.platforms.map(p => (
                      <span key={p} className="text-xs bg-[#0f1923] text-slate-300 px-2.5 py-1 rounded-full border border-white/10">{p}</span>
                    ))}
                  </div>
                )}

                {/* Дополнительные настройки */}
                {trackFiles.length > 0 && (
                  <>
                    <div className="h-px bg-white/5" />
                    <h4 className="font-bold text-base">Дополнительные настройки</h4>
                    <p className="text-xs text-slate-500 -mt-2">TikTok</p>
                    <div className="space-y-2">
                      {trackFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-sm text-slate-500 w-5 shrink-0">{i + 1}.</span>
                          <div className="w-10 h-10 rounded-full bg-[#f5a623]/20 flex items-center justify-center shrink-0">
                            <Icon name="Play" size={14} className="text-[#f5a623] ml-0.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{f.name.replace(/\.[^.]+$/, "")}</p>
                            <p className="text-xs text-slate-500">{form.artist_name || "—"}</p>
                          </div>
                          <Icon name="ChevronDown" size={16} className="text-slate-500 shrink-0" />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">{error}</p>}
            </>
          )}

          {/* Кнопки навигации */}
          <div className="flex items-center justify-between pt-2 pb-6">
            <Button variant="outline" onClick={stepIndex === 0 ? onCancel : prev} className="border-white/15 text-slate-300 hover:bg-white/5">
              {stepIndex === 0 ? "Отмена" : "← Назад"}
            </Button>
            {stepIndex < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canNext()} className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold">
                Далее →
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving} className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold px-6">
                {saving ? "Отправка..." : "Отправить на модерацию"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Боковой чеклист — полностью кликабельный ── */}
        <div className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3 px-1">Разделы</p>
            <div className="space-y-0.5">
              {SIDEBAR_SECTIONS.map((item, i) => {
                const itemStepIdx = STEPS.findIndex(s => s.key === item.step);
                const isDone    = itemStepIdx < stepIndex;
                const isActive  = item.step === step;
                const clickable = itemStepIdx <= stepIndex;
                return (
                  <button
                    key={i}
                    onClick={() => clickable && goToSection(item)}
                    disabled={!clickable}
                    className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      clickable ? "hover:bg-white/5 cursor-pointer" : "cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isDone   ? "bg-[#f5a623]/20 border-[#f5a623]/50" :
                      isActive ? "border-[#f5a623]/60 bg-[#f5a623]/10" :
                                 "border-white/15"
                    }`}>
                      {isDone && <Icon name="Check" size={8} className="text-[#f5a623]" />}
                    </div>
                    <span className={`text-xs leading-tight transition-colors ${
                      isActive ? "text-[#f5a623] font-medium" :
                      isDone   ? "text-slate-400" :
                                 "text-slate-600"
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Прогресс-бар */}
            <div className="mt-5 px-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">Прогресс</span>
                <span className="text-xs text-slate-400">{stepIndex + 1} / {STEPS.length}</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#f5a623] rounded-full transition-all duration-500"
                  style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}