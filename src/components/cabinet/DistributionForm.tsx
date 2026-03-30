import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

interface DistRequest {
  id: number; release_id: number | null; platforms: string;
  message: string; lyrics: string | null; copyright: string | null;
  status: string; created_at: string; audio_url?: string | null;
}

interface Release { id: number; title: string; }

interface Props {
  releases: Release[];
  onSubmitted: (req: DistRequest) => void;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новая заявка", processing: "В обработке", done: "Выполнена",
};
const STATUS_COLORS: Record<string, string> = {
  new: "bg-zinc-700/60 text-zinc-200",
  processing: "bg-blue-500/20 text-blue-300",
  done: "bg-green-500/20 text-green-300",
};

export default function DistributionForm({ releases, onSubmitted }: Props) {
  const [platforms, setPlatforms] = useState("");
  const [message, setMessage] = useState("");
  const [releaseId, setReleaseId] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [copyright, setCopyright] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ic = "bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600 focus:border-[#f5a623]/40";
  const sc = "w-full bg-[#0f1923] border border-white/10 text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#f5a623]/40 transition-colors";

  const handleSubmit = async () => {
    if (!platforms.trim()) { setError("Укажите платформы"); return; }
    setSubmitting(true);
    setError("");
    setSuccess("");

    let audio_file_data: string | undefined;
    let audio_file_name: string | undefined;

    if (audioFile) {
      const toBase64 = (f: File): Promise<string> =>
        new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
      audio_file_data = await toBase64(audioFile);
      audio_file_name = audioFile.name;
    }

    const res = await api.distribution.submit({
      platforms,
      message,
      lyrics: lyrics || undefined,
      copyright: copyright || undefined,
      release_id: releaseId ? Number(releaseId) : undefined,
      audio_file_data,
      audio_file_name,
    });

    if (res.request) {
      onSubmitted(res.request);
      setSuccess("Заявка отправлена! Мы свяжемся с вами.");
      setPlatforms("");
      setMessage("");
      setReleaseId("");
      setLyrics("");
      setCopyright("");
      setAudioFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setError(res.error || "Ошибка отправки заявки");
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-3">
      {releases.length > 0 && (
        <select
          value={releaseId}
          onChange={(e) => setReleaseId(e.target.value)}
          className={sc}
        >
          <option value="">Выберите релиз (необязательно)</option>
          {releases.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
        </select>
      )}
      <Input
        value={platforms}
        onChange={(e) => setPlatforms(e.target.value)}
        placeholder="Платформы: Spotify, Apple Music, VK Music..."
        className={ic}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Дополнительная информация..."
        rows={3}
        className={`${sc} resize-none`}
      />
      <textarea
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        placeholder="Текст трека (необязательно)"
        rows={4}
        className={`${sc} resize-none`}
      />
      <Input
        value={copyright}
        onChange={(e) => setCopyright(e.target.value)}
        placeholder="Правообладатель / Copyright"
        className={ic}
      />

      {/* Аудиофайл */}
      <div>
        <p className="text-xs text-slate-400 mb-1.5">Аудиофайл для модерации (необязательно)</p>
        <input
          ref={fileRef}
          type="file"
          accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg"
          onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        {audioFile ? (
          <div className="flex items-center gap-3 bg-[#0f1923] border border-white/10 rounded-lg px-3 py-2.5">
            <span className="text-sm text-white truncate flex-1">{audioFile.name}</span>
            <button
              onClick={() => { setAudioFile(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-slate-500 hover:text-red-400 transition-colors text-xs shrink-0"
            >
              Удалить
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 border border-dashed border-white/15 hover:border-[#f5a623]/40 rounded-lg text-slate-400 hover:text-[#f5a623] text-sm transition-colors"
          >
            + Прикрепить аудиофайл
          </button>
        )}
      </div>

      {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">{success}</p>}
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="bg-[#f5a623] text-black hover:bg-[#f5a623]/90 font-semibold"
      >
        {submitting ? "Отправляем..." : "Отправить заявку"}
      </Button>
    </div>
  );
}

export { STATUS_LABELS, STATUS_COLORS };
