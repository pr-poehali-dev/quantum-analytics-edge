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

const SIDEBAR_ITEMS: { step: Step; label: string }[] = [
  { step: "release", label: "Основная информация" },
  { step: "release", label: "Персоны и роли" },
  { step: "release", label: "Жанр и поджанр" },
  { step: "tracklist", label: "Идентификация" },
  { step: "tracklist", label: "Название лейбла" },
  { step: "platforms", label: "Даты" },
  { step: "platforms", label: "Площадки и территории" },
  { step: "review", label: "Загрузка видео" },
  { step: "review", label: "Сопроводительные материалы" },
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

  return (
    <div className="flex flex-col h-full">
      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={onCancel} className="text-slate-500 hover:text-white transition-colors">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <h2 className="text-xl font-bold">Новый релиз</h2>
      </div>

      {/* Шаги (табы) */}
      <div className="flex gap-1 mb-6 border-b border-white/10">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            onClick={() => { if (i <= stepIndex || canNext()) setStep(s.key); }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              step === s.key
                ? "border-[#f5a623] text-white"
                : i < stepIndex
                ? "border-transparent text-slate-400 hover:text-white"
                : "border-transparent text-slate-600"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Основной контент */}
        <div className="flex-1 min-w-0 overflow-y-auto">

          {/* ─── ШАГ 1: РЕЛИЗ ─── */}
          {step === "release" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-semibold text-base mb-0.5">Работа с релизом</h3>
                <p className="text-slate-500 text-sm">Заполните общую информацию по релизу</p>
              </div>

              {/* Основная информация */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-0.5">Основная информация</h4>
                  <p className="text-slate-500 text-xs">Заполните общую информацию по вашему релизу</p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Язык метаданных</label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full bg-[#0f1923] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#f5a623]/40 transition-colors"
                  >
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Название релиза <span className="text-red-400">*</span></label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Введите название"
                      className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Подзаголовок</label>
                    <Input
                      value={form.subtitle}
                      onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                      placeholder="Введите подзаголовок"
                      className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Тип релиза</label>
                  <div className="flex flex-col gap-2">
                    {(["Single", "EP", "Album"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="type"
                          value={t}
                          checked={form.type === t}
                          onChange={() => setForm({ ...form, type: t })}
                          className="accent-[#f5a623]"
                        />
                        <span className="text-sm text-slate-300">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Персоны и роли */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-0.5">Персоны и роли</h4>
                  <p className="text-slate-500 text-xs">Укажите исполнителя</p>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Исполнитель <span className="text-red-400">*</span></label>
                  <Input
                    value={form.artist_name}
                    onChange={(e) => setForm({ ...form, artist_name: e.target.value })}
                    placeholder="Имя артиста"
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Жанр */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-0.5">Жанр и поджанр</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Жанр</label>
                    <select
                      value={form.genre}
                      onChange={(e) => setForm({ ...form, genre: e.target.value })}
                      className="w-full bg-[#0f1923] border border-white/10 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#f5a623]/40 transition-colors"
                    >
                      <option value="">Выберите жанр</option>
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1.5 block">Поджанр</label>
                    <Input
                      value={form.subgenre}
                      onChange={(e) => setForm({ ...form, subgenre: e.target.value })}
                      placeholder="Поджанр"
                      className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── ШАГ 2: ТРЕК-ЛИСТ ─── */}
          {step === "tracklist" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-semibold text-base mb-0.5">Трек-лист</h3>
                <p className="text-slate-500 text-sm">Загрузите треки и заполните метаданные</p>
              </div>

              {/* Обложка */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => coverRef.current?.click()}
                      className="border-white/20 text-white hover:bg-white/10 text-xs"
                    >
                      <Icon name="Upload" size={13} className="mr-1.5" />
                      {coverFile ? coverFile.name.slice(0, 20) + "…" : "Выбрать файл"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Треки */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Аудиофайлы</h4>
                <p className="text-xs text-slate-400">WAV, 16 bit, 44.1 kHz, Stereo</p>
                <input
                  ref={trackRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setTrackFiles(prev => [...prev, ...files]);
                  }}
                  className="hidden"
                />
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => trackRef.current?.click()}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Icon name="Plus" size={14} className="mr-1.5" />
                  Добавить трек
                </Button>
              </div>

              {/* Идентификация */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Идентификация</h4>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">UPC / EAN (если есть)</label>
                  <Input
                    value={form.upc}
                    onChange={(e) => setForm({ ...form, upc: e.target.value })}
                    placeholder="Оставьте пустым для автогенерации"
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Название лейбла</label>
                  <Input
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="KS Label"
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── ШАГ 3: ПЛОЩАДКИ ─── */}
          {step === "platforms" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-semibold text-base mb-0.5">Площадки и даты</h3>
                <p className="text-slate-500 text-sm">Выберите где разместить релиз</p>
              </div>

              {/* Дата релиза */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Даты</h4>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Дата релиза</label>
                  <Input
                    type="date"
                    value={form.release_date}
                    onChange={(e) => setForm({ ...form, release_date: e.target.value })}
                    className="bg-[#0f1923] border-white/10 text-white"
                  />
                </div>
              </div>

              {/* Площадки */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Площадки</h4>
                  <button
                    onClick={() => setForm(f => ({ ...f, platforms: f.platforms.length === ALL_PLATFORMS.length ? [] : [...ALL_PLATFORMS] }))}
                    className="text-xs text-[#f5a623] hover:text-[#f5a623]/80 transition-colors"
                  >
                    {form.platforms.length === ALL_PLATFORMS.length ? "Снять все" : "Выбрать все"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_PLATFORMS.map((p) => (
                    <label key={p} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.platforms.includes(p)}
                        onChange={() => togglePlatform(p)}
                        className="accent-[#f5a623]"
                      />
                      <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{p}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Текст и правообладатель */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
                <h4 className="font-semibold text-sm">Сопроводительные материалы</h4>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Правообладатель / Copyright</label>
                  <Input
                    value={form.copyright}
                    onChange={(e) => setForm({ ...form, copyright: e.target.value })}
                    placeholder="© 2025 KS Label"
                    className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Текст трека (необязательно)</label>
                  <textarea
                    value={form.lyrics}
                    onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
                    placeholder="Текст песни..."
                    rows={5}
                    className="w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2.5 text-sm resize-none outline-none focus:border-[#f5a623]/40 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ─── ШАГ 4: ПРОВЕРКА ─── */}
          {step === "review" && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="font-semibold text-base mb-0.5">Проверка</h3>
                <p className="text-slate-500 text-sm">Убедитесь что всё верно перед отправкой</p>
              </div>

              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-4">
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

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
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
                  <div className="pt-2 border-t border-white/10">
                    <p className="text-xs text-slate-500 mb-2">Площадки</p>
                    <div className="flex flex-wrap gap-1.5">
                      {form.platforms.map(p => (
                        <span key={p} className="text-xs bg-[#f5a623]/10 text-[#f5a623] px-2 py-1 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Чеклист */}
              <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-5 space-y-2.5">
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
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-green-500/20" : "bg-white/5"}`}>
                      {ok ? <Icon name="Check" size={10} className="text-green-400" /> : <Icon name="Minus" size={10} className="text-slate-600" />}
                    </div>
                    <span className={`text-sm ${ok ? "text-slate-300" : "text-slate-500"}`}>{label}</span>
                  </div>
                ))}
              </div>

              {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}
        </div>

        {/* Боковая панель — прогресс */}
        <div className="hidden lg:block w-52 shrink-0">
          <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-4 sticky top-0">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-3">Разделы</p>
            <div className="space-y-1">
              {SIDEBAR_ITEMS.map((item, i) => {
                const isActiveStep = item.step === step;
                const isDoneStep = STEPS.findIndex(s => s.key === item.step) < stepIndex;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                      isDoneStep ? "bg-[#f5a623]/20 border-[#f5a623]/40" :
                      isActiveStep ? "bg-[#f5a623]/10 border-[#f5a623]/60" :
                      "border-white/15"
                    }`}>
                      {isDoneStep && <Icon name="Check" size={8} className="text-[#f5a623]" />}
                    </div>
                    <span className={`text-xs transition-colors ${
                      isActiveStep ? "text-[#f5a623]" :
                      isDoneStep ? "text-slate-400" :
                      "text-slate-600"
                    }`}>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Навигация */}
      <div className="flex items-center justify-between pt-5 mt-5 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={stepIndex === 0 ? onCancel : prev}
          className="text-slate-400 hover:text-white"
        >
          <Icon name="ChevronLeft" size={16} className="mr-1" />
          {stepIndex === 0 ? "Отмена" : "Назад"}
        </Button>

        {step !== "review" ? (
          <Button
            onClick={next}
            disabled={!canNext()}
            className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold"
          >
            Далее
            <Icon name="ChevronRight" size={16} className="ml-1" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={saving || !form.title.trim() || !coverFile}
            className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <Icon name="Loader" size={15} className="animate-spin" />
                Отправляю...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon name="Send" size={15} />
                Отправить на модерацию
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
