import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

const GENRES = ["Trap", "Drill", "R&B", "Hip-Hop", "Pop", "Club", "Lo-fi", "Другой"];

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  });

export default function UploadBeatModal({ onClose, onSuccess }: Props) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("RUB");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const ic = "w-full bg-black border border-white/10 rounded-md px-3 py-2 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-purple-500/50 transition-colors";

  const handleUpload = async () => {
    if (!title.trim() || !audioFile) return;
    if (!telegram.trim() && !email.trim()) {
      setError("Укажите Telegram или email для связи с покупателями");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const file_data = await toBase64(audioFile);
      const payload: Record<string, unknown> = {
        title: title.trim(),
        genre: genre || undefined,
        bpm: bpm ? parseInt(bpm) : undefined,
        price: price ? parseFloat(price) : undefined,
        currency,
        contact_telegram: telegram.trim() || undefined,
        contact_email: email.trim() || undefined,
        description: description.trim() || undefined,
        tags: tags.trim() || undefined,
        file_data,
        file_name: audioFile.name,
      };
      if (coverFile) {
        payload.cover_data = await toBase64(coverFile);
        payload.cover_name = coverFile.name;
      }
      const res = await api.beatstore.uploadBeat(payload);
      if (res.beat) {
        onSuccess();
      } else {
        setError(res.error || "Ошибка загрузки");
        setUploading(false);
      }
    } catch {
      setError("Ошибка загрузки. Попробуйте ещё раз.");
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Загрузить бит</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Название бита *"
            className={ic}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={genre}
              onChange={e => setGenre(e.target.value)}
              className="bg-black border border-white/10 rounded-md px-3 py-2 text-white text-sm outline-none focus:border-purple-500/50"
            >
              <option value="">Жанр</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <input
              value={bpm}
              onChange={e => setBpm(e.target.value)}
              placeholder="BPM"
              type="number"
              className={ic}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="Цена (0 = бесплатно)"
              type="number"
              className={ic}
            />
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              className="bg-black border border-white/10 rounded-md px-3 py-2 text-white text-sm outline-none focus:border-purple-500/50"
            >
              <option value="RUB">₽ RUB</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>
          <input
            value={telegram}
            onChange={e => setTelegram(e.target.value)}
            placeholder="Telegram (@username)"
            className={ic}
          />
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email для связи"
            className={ic}
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Описание (необязательно)"
            className={ic}
          />
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Теги через запятую (dark, melodic...)"
            className={ic}
          />

          <div>
            <p className="text-zinc-400 text-xs mb-1.5">Аудиофайл (MP3, WAV) *</p>
            <input
              ref={audioInputRef}
              type="file"
              accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
              onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              <Icon name="Upload" size={14} />
              {audioFile ? audioFile.name : "Выбрать файл"}
            </button>
          </div>

          <div>
            <p className="text-zinc-400 text-xs mb-1.5">Обложка (JPG, PNG — необязательно)</p>
            <input
              ref={coverInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              onChange={e => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-lg text-sm text-zinc-300 transition-colors"
            >
              <Icon name="Image" size={14} />
              {coverFile ? coverFile.name : "Выбрать файл"}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button
            onClick={handleUpload}
            disabled={uploading || !title.trim() || !audioFile}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <Icon name="Loader2" size={16} className="animate-spin" />
                Загружаю...
              </span>
            ) : "Опубликовать бит"}
          </Button>
        </div>
      </div>
    </div>
  );
}
