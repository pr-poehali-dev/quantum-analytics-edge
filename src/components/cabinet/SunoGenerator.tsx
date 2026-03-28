import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Icon from "@/components/ui/icon";

interface SunoTrack {
  id?: string;
  title?: string;
  audio_url?: string;
  image_url?: string;
  duration?: number;
  tags?: string;
  lyric?: string;
  status?: string;
}

interface GenerationResult {
  taskId?: string;
  tracks?: SunoTrack[];
  status?: string;
  error?: string;
  raw?: unknown;
}

const MUSIC_STYLES = [
  "Pop", "Rock", "Hip-Hop", "R&B", "Electronic", "Jazz", "Classical",
  "Country", "Reggae", "Folk", "Metal", "Lo-fi", "Phonk", "Trap", "Indie",
];

export default function SunoGenerator() {
  const [mode, setMode] = useState<"prompt" | "custom">("prompt");
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [instrumental, setInstrumental] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [polling, setPolling] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setPolling(false);
  };

  const pollStatus = (taskId: string) => {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 60) { stopPolling(); return; }
      const res = await api.suno.status(taskId);
      const data = res?.data || res;
      const clips = data?.data?.clips || data?.clips || data?.data || [];
      const statusCode = data?.data?.status || data?.status || "";
      if (Array.isArray(clips) && clips.length > 0 && clips[0]?.audio_url) {
        setResult({ taskId, tracks: clips });
        stopPolling();
      } else if (statusCode === "complete" || statusCode === "SUCCESS") {
        setResult({ taskId, tracks: Array.isArray(clips) ? clips : [], status: statusCode });
        stopPolling();
      } else if (statusCode === "error" || statusCode === "FAILED") {
        setResult({ error: "Генерация завершилась с ошибкой. Попробуй ещё раз.", taskId });
        stopPolling();
      }
    }, 5000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !(mode === "custom" && lyrics.trim())) return;
    setLoading(true);
    setResult(null);
    stopPolling();

    const payload: Record<string, unknown> = {
      title: title || "Трек без названия",
      style,
      instrumental,
    };
    if (mode === "custom" && lyrics.trim()) {
      payload.lyrics = lyrics;
      payload.prompt = prompt;
    } else {
      payload.prompt = prompt;
    }

    const res = await api.suno.generate(payload);
    setLoading(false);

    const data = res?.data || res;
    const taskId =
      data?.task_id || data?.taskId || data?.data?.task_id ||
      data?.id || data?.data?.id || "";
    const clips = data?.data?.clips || data?.clips || data?.data || [];

    if (taskId) {
      setResult({ taskId, status: "processing" });
      setPolling(true);
      pollStatus(taskId);
    } else if (Array.isArray(clips) && clips.length > 0) {
      setResult({ tracks: clips });
    } else if (res?.error) {
      setResult({ error: res.error });
    } else {
      setResult({ raw: res, status: "processing", taskId: "" });
    }
  };

  const handlePlay = (idx: number) => {
    if (playingIdx === idx) {
      audioRefs.current[idx]?.pause();
      setPlayingIdx(null);
    } else {
      if (playingIdx !== null) audioRefs.current[playingIdx]?.pause();
      audioRefs.current[idx]?.play();
      setPlayingIdx(idx);
    }
  };

  const fmtDuration = (sec?: number) => {
    if (!sec) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 to-[#1a2636] border border-purple-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
            <Icon name="Sparkles" size={20} className="text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Генерация песен — Suno AI</h3>
            <p className="text-slate-400 text-sm">Опиши трек — ИИ создаст музыку за 1–2 минуты</p>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="bg-[#1a2636] border border-white/5 rounded-2xl p-6 space-y-5">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("prompt")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${mode === "prompt" ? "bg-[#f5a623] text-black" : "bg-[#0f1923] text-slate-400 hover:text-white"}`}
          >
            По описанию
          </button>
          <button
            onClick={() => setMode("custom")}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${mode === "custom" ? "bg-[#f5a623] text-black" : "bg-[#0f1923] text-slate-400 hover:text-white"}`}
          >
            По тексту песни
          </button>
        </div>

        <div className="space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название трека (необязательно)"
            className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600"
          />

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === "prompt"
              ? "Опиши настроение и идею: грустная поп-баллада про дождь в городе, женский вокал..."
              : "Дополнительное описание стиля (необязательно)"}
            rows={3}
            className="w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-purple-500/40 transition-colors"
          />

          {mode === "custom" && (
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={"Текст песни:\n[Verse]\nОпиши свои строки...\n[Chorus]\n..."}
              rows={6}
              className="w-full bg-[#0f1923] border border-white/10 text-white placeholder:text-slate-600 rounded-lg px-3 py-2 text-sm resize-none outline-none focus:border-purple-500/40 transition-colors font-mono"
            />
          )}

          {/* Style tags */}
          <div>
            <p className="text-xs text-slate-500 mb-2">Стиль (выбери или напиши)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {MUSIC_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle((prev) => prev === s ? "" : s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${style === s ? "bg-purple-500 text-white" : "bg-[#0f1923] text-slate-400 hover:text-white border border-white/10"}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <Input
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Или введи стиль вручную: dreamy, emotional, cinematic..."
              className="bg-[#0f1923] border-white/10 text-white placeholder:text-slate-600 text-sm"
            />
          </div>

          {/* Instrumental toggle */}
          <button
            onClick={() => setInstrumental(!instrumental)}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-colors ${instrumental ? "border-purple-500/40 bg-purple-500/10" : "border-white/10 bg-[#0f1923]"}`}
          >
            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${instrumental ? "border-purple-400 bg-purple-400" : "border-slate-600"}`}>
              {instrumental && <Icon name="Check" size={12} className="text-black" />}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Инструментал</p>
              <p className="text-xs text-slate-500">Без вокала, только музыка</p>
            </div>
          </button>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || polling || (!prompt.trim() && !(mode === "custom" && lyrics.trim()))}
          className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-3 rounded-xl"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" /> Отправляем запрос...
            </span>
          ) : polling ? (
            <span className="flex items-center gap-2">
              <Icon name="Loader2" size={16} className="animate-spin" /> Генерация... (1–2 мин)
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Icon name="Sparkles" size={16} /> Сгенерировать
            </span>
          )}
        </Button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {result.error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm flex items-center gap-3">
              <Icon name="AlertCircle" size={18} className="shrink-0" />
              {result.error}
            </div>
          )}

          {polling && (
            <div className="bg-[#1a2636] border border-purple-500/20 rounded-xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <Icon name="Music2" size={22} className="text-purple-400 animate-pulse" />
              </div>
              <div>
                <p className="font-semibold">Suno AI пишет твой трек...</p>
                <p className="text-slate-400 text-sm mt-0.5">Это займёт 1–2 минуты. Страницу закрывать не нужно.</p>
                {result.taskId && <p className="text-slate-600 text-xs mt-1 font-mono">ID: {result.taskId}</p>}
              </div>
            </div>
          )}

          {result.tracks && result.tracks.length > 0 && (
            <>
              <p className="text-slate-400 text-sm px-1">Готово! Suno создал {result.tracks.length} вариант(а):</p>
              {result.tracks.map((track, idx) => (
                <div key={track.id || idx} className="bg-[#1a2636] border border-white/5 rounded-xl overflow-hidden">
                  {track.image_url && (
                    <div className="relative">
                      <img src={track.image_url} alt={track.title} className="w-full h-40 object-cover opacity-60" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#1a2636] to-transparent" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{track.title || `Трек ${idx + 1}`}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {track.tags && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{track.tags}</span>}
                          {track.duration && <span className="text-xs text-slate-500">{fmtDuration(track.duration)}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {track.audio_url && (
                          <>
                            <button
                              onClick={() => handlePlay(idx)}
                              className="w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center transition-colors"
                            >
                              <Icon name={playingIdx === idx ? "Pause" : "Play"} size={16} className="text-white" />
                            </button>
                            <a
                              href={track.audio_url}
                              download={`${track.title || "track"}.mp3`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-10 h-10 bg-[#0f1923] hover:bg-white/10 rounded-full flex items-center justify-center transition-colors border border-white/10"
                            >
                              <Icon name="Download" size={16} className="text-slate-300" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {track.audio_url && (
                      <audio
                        ref={(el) => { audioRefs.current[idx] = el; }}
                        src={track.audio_url}
                        onEnded={() => setPlayingIdx(null)}
                        className="hidden"
                      />
                    )}

                    {track.lyric && (
                      <details className="mt-3">
                        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">Показать текст</summary>
                        <pre className="mt-2 text-xs text-slate-400 whitespace-pre-wrap font-mono bg-[#0f1923] rounded-lg p-3 max-h-48 overflow-y-auto">{track.lyric}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Tips */}
      <div className="bg-[#0f1923] border border-white/5 rounded-xl p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Советы для лучшего результата</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-xs text-slate-400"><Icon name="Lightbulb" size={12} className="text-[#f5a623] shrink-0 mt-0.5" /> Опиши настроение, инструменты и атмосферу: <span className="text-white">"грустный piano ballad, дождь, одиночество"</span></li>
          <li className="flex items-start gap-2 text-xs text-slate-400"><Icon name="Lightbulb" size={12} className="text-[#f5a623] shrink-0 mt-0.5" /> Укажи язык вокала: <span className="text-white">"russian lyrics"</span> или <span className="text-white">"english vocals"</span></li>
          <li className="flex items-start gap-2 text-xs text-slate-400"><Icon name="Lightbulb" size={12} className="text-[#f5a623] shrink-0 mt-0.5" /> Для кастомного режима используй теги: <span className="text-white">[Verse], [Chorus], [Bridge]</span></li>
        </ul>
      </div>
    </div>
  );
}
