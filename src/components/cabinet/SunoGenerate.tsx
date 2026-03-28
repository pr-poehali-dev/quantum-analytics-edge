import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

type Mode = "description" | "custom";

interface SongResult {
  id: string;
  title: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  status: string;
  duration?: number;
}

export default function SunoGenerate() {
  const [mode, setMode] = useState<Mode>("description");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingId(null);
  };

  const playAudio = (song: SongResult) => {
    const url = song.audio_url || song.stream_audio_url;
    if (!url) return;
    if (playingId === song.id) {
      stopAudio();
      return;
    }
    stopAudio();
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(song.id);
  };

  const startPolling = (id: string) => {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      const res = await api.suno.status(id);
      const data = res?.data || res;
      const clips: SongResult[] = data?.clips || data?.data || [];
      const allDone = clips.length > 0 && clips.every((c: SongResult) => c.status === "complete" || c.audio_url);
      if (allDone) {
        setSongs(clips);
        setPolling(false);
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, 5000);
  };

  const handleGenerate = async () => {
    setError("");
    setSongs([]);
    setTaskId(null);
    if (!prompt.trim() && !lyrics.trim()) {
      setError("Введите описание или текст песни");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { instrumental };
      if (mode === "description") {
        payload.prompt = prompt;
        payload.style = style;
        payload.title = title;
      } else {
        payload.lyrics = lyrics;
        payload.style = style;
        payload.title = title;
        payload.customMode = true;
      }
      const res = await api.suno.generate(payload);
      if (res?.error) {
        setError(res.error);
        return;
      }
      const id = res?.data?.taskId || res?.taskId || res?.task_id || res?.id;
      if (id) {
        setTaskId(id);
        startPolling(id);
      } else {
        const clips: SongResult[] = res?.data?.clips || res?.clips || [];
        if (clips.length) setSongs(clips);
        else setError("Не удалось запустить генерацию. Проверьте SUNO_API_KEY.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Генерация песен</h2>
        <p className="text-slate-400 text-sm">Создай уникальный трек с помощью Suno AI — опиши настроение или вставь текст</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("description")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "description" ? "bg-[#f5a623] text-black" : "bg-[#1e2d3d] text-slate-300 hover:bg-[#2a3a4a]"}`}
        >
          По описанию
        </button>
        <button
          onClick={() => setMode("custom")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "custom" ? "bg-[#f5a623] text-black" : "bg-[#1e2d3d] text-slate-300 hover:bg-[#2a3a4a]"}`}
        >
          Свой текст
        </button>
      </div>

      <div className="bg-[#1a2535] rounded-xl p-5 space-y-4 border border-[#2a3a4a]">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Название трека</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Например: Ночной город"
              className="bg-[#0f1923] border-[#2a3a4a] text-white placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Стиль / жанр</label>
            <Input
              value={style}
              onChange={e => setStyle(e.target.value)}
              placeholder="hip-hop, dark, lo-fi..."
              className="bg-[#0f1923] border-[#2a3a4a] text-white placeholder:text-slate-600"
            />
          </div>
        </div>

        {mode === "description" ? (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Описание песни</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Опиши атмосферу, настроение, о чём должна быть песня..."
              rows={3}
              className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-white placeholder:text-slate-600 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#f5a623]"
            />
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Текст песни</label>
            <textarea
              value={lyrics}
              onChange={e => setLyrics(e.target.value)}
              placeholder="Вставь или напиши текст песни..."
              rows={6}
              className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-white placeholder:text-slate-600 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#f5a623]"
            />
          </div>
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setInstrumental(v => !v)}
            className={`w-10 h-5 rounded-full transition-all relative ${instrumental ? "bg-[#f5a623]" : "bg-[#2a3a4a]"}`}
          >
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${instrumental ? "left-5" : "left-0.5"}`} />
          </div>
          <span className="text-sm text-slate-300">Инструментал (без вокала)</span>
        </label>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          onClick={handleGenerate}
          disabled={loading || polling}
          className="w-full bg-[#f5a623] hover:bg-[#e09510] text-black font-semibold"
        >
          {loading ? (
            <span className="flex items-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" /> Отправляю запрос...</span>
          ) : polling ? (
            <span className="flex items-center gap-2"><Icon name="Loader2" size={16} className="animate-spin" /> Генерирую... (~30–60 сек)</span>
          ) : (
            <span className="flex items-center gap-2"><Icon name="Sparkles" size={16} /> Сгенерировать</span>
          )}
        </Button>
      </div>

      {polling && !songs.length && (
        <div className="bg-[#1a2535] border border-[#2a3a4a] rounded-xl p-6 text-center">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-[#f5a623]/10 flex items-center justify-center">
              <Icon name="Music2" size={24} className="text-[#f5a623] animate-pulse" />
            </div>
          </div>
          <p className="text-slate-300 font-medium">Suno AI создаёт твою песню</p>
          <p className="text-slate-500 text-sm mt-1">Обычно занимает 30–60 секунд</p>
          <div className="mt-3 flex justify-center gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#f5a623] animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      )}

      {songs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white font-semibold text-sm">Результат</h3>
          {songs.map(song => (
            <div key={song.id} className="bg-[#1a2535] border border-[#2a3a4a] rounded-xl p-4 flex items-center gap-4">
              {song.image_url ? (
                <img src={song.image_url} alt={song.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-[#0f1923] flex items-center justify-center flex-shrink-0">
                  <Icon name="Music2" size={24} className="text-[#f5a623]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{song.title || "Без названия"}</p>
                {song.duration && <p className="text-slate-400 text-xs mt-0.5">{formatDuration(song.duration)}</p>}
              </div>
              <div className="flex items-center gap-2">
                {(song.audio_url || song.stream_audio_url) && (
                  <button
                    onClick={() => playAudio(song)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${playingId === song.id ? "bg-[#f5a623] text-black" : "bg-[#f5a623]/10 text-[#f5a623] hover:bg-[#f5a623]/20"}`}
                  >
                    <Icon name={playingId === song.id ? "Pause" : "Play"} size={18} />
                  </button>
                )}
                {song.audio_url && (
                  <a
                    href={song.audio_url}
                    download
                    className="w-10 h-10 rounded-full bg-[#2a3a4a] flex items-center justify-center text-slate-300 hover:text-white transition-all"
                  >
                    <Icon name="Download" size={18} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-[#0f1923] rounded-xl p-4 border border-[#1e2d3d]">
        <p className="text-xs text-slate-500 font-medium mb-2">Советы для лучшего результата</p>
        <ul className="text-xs text-slate-500 space-y-1">
          <li>• Опиши стиль: <span className="text-slate-400">trap, dark, emotional, lo-fi, pop...</span></li>
          <li>• Укажи инструменты: <span className="text-slate-400">piano, guitar, 808 bass...</span></li>
          <li>• Добавь настроение: <span className="text-slate-400">melancholic, energetic, dreamy...</span></li>
        </ul>
      </div>
    </div>
  );
}
