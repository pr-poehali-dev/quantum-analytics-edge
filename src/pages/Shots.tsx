import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface Shot {
  id: number;
  user_id: number;
  artist_name: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration: number;
  views: number;
  likes_count: number;
  comments_count: number;
  liked: boolean;
  is_owner: boolean;
  created_at: string;
}

interface Comment {
  id: number;
  user_id: number;
  artist_name: string;
  text: string;
  created_at: string;
}

function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: (shot: Shot) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!title.trim() || !videoFile) { setError("Укажите название и видеофайл"); return; }
    setUploading(true); setError("");
    try {
      setProgress("Получаем ссылку для загрузки...");
      const presign = await api.shots.presign({ video_name: videoFile.name, thumb_name: thumbFile?.name || "" });
      if (!presign.video_upload_url) { setError(presign.error || "Ошибка получения ссылки"); setUploading(false); setProgress(""); return; }

      setProgress("Загружаем видео...");
      const videoExt = videoFile.name.rsplit ? videoFile.name.split(".").pop()?.toLowerCase() : "mp4";
      const videoTypes: Record<string, string> = { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm", avi: "video/x-msvideo" };
      await fetch(presign.video_upload_url, { method: "PUT", body: videoFile, headers: { "Content-Type": videoTypes[videoExt || "mp4"] || "video/mp4" } });

      if (thumbFile && presign.thumb_upload_url) {
        setProgress("Загружаем превью...");
        const tExt = thumbFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const imgTypes: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
        await fetch(presign.thumb_upload_url, { method: "PUT", body: thumbFile, headers: { "Content-Type": imgTypes[tExt] || "image/jpeg" } });
      }

      setProgress("Сохраняем...");
      const res = await api.shots.save({ title, description: description || undefined, video_url: presign.video_url, thumbnail_url: thumbFile ? presign.thumb_url : undefined });
      setUploading(false); setProgress("");
      if (res.shot) { onUploaded(res.shot); onClose(); }
      else setError(res.error || "Ошибка сохранения");
    } catch {
      setError("Ошибка загрузки. Проверьте файл и попробуйте ещё раз.");
      setUploading(false); setProgress("");
    }
  };

  const ic = "w-full bg-black/40 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors";

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-zinc-950 border border-white/10 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 pb-8 sm:pb-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg">Новый видеошот</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><Icon name="X" size={20} /></button>
        </div>
        <div className="space-y-3">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название *" className={ic} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание (необязательно)" rows={2} className={`${ic} resize-none`} />

          <input ref={videoRef} type="file" accept="video/*,.mp4,.mov,.webm" onChange={e => setVideoFile(e.target.files?.[0] || null)} className="hidden" />
          <button onClick={() => videoRef.current?.click()} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${videoFile ? "border-white/20 bg-white/5" : "border-dashed border-white/15 hover:border-white/30"}`}>
            <Icon name={videoFile ? "CheckCircle" : "Video"} size={18} className={videoFile ? "text-green-400" : "text-white/40"} />
            <span className="text-sm text-white/60 truncate">{videoFile ? videoFile.name : "Выбрать видео (MP4, MOV, WebM)"}</span>
          </button>

          <input ref={thumbRef} type="file" accept="image/*" onChange={e => setThumbFile(e.target.files?.[0] || null)} className="hidden" />
          <button onClick={() => thumbRef.current?.click()} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${thumbFile ? "border-white/20 bg-white/5" : "border-dashed border-white/10 hover:border-white/20"}`}>
            <Icon name={thumbFile ? "CheckCircle" : "Image"} size={16} className={thumbFile ? "text-green-400" : "text-white/30"} />
            <span className="text-sm text-white/40 truncate">{thumbFile ? thumbFile.name : "Превью (необязательно)"}</span>
          </button>

          {error && <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-2">{error}</p>}
          {progress && <p className="text-white/50 text-sm text-center">{progress}</p>}

          <button onClick={handleUpload} disabled={uploading} className="w-full py-3.5 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50 text-sm">
            {uploading ? "Загружаем..." : "Опубликовать"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommentsPanel({ shot, onClose, user }: { shot: Shot; onClose: () => void; user: { artist_name: string } | null }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.shots.comments(shot.id).then(r => setComments(r.comments || []));
  }, [shot.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const res = await api.shots.comment(shot.id, text);
    if (res.comment) { setComments(p => [...p, res.comment]); setText(""); }
    setSending(false);
  };

  return (
    <div className="absolute inset-0 bg-black/95 flex flex-col z-10 rounded-2xl sm:rounded-none">
      <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
        <button onClick={onClose} className="text-white/50 hover:text-white"><Icon name="ArrowLeft" size={20} /></button>
        <span className="font-semibold">Комментарии · {comments.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 && <p className="text-white/30 text-sm text-center pt-8">Комментариев пока нет — будь первым!</p>}
        {comments.map(c => (
          <div key={c.id} className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-xs font-bold">
              {c.artist_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-xs text-white/50 mb-0.5">{c.artist_name}</p>
              <p className="text-sm text-white/90">{c.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-4 border-t border-white/10 shrink-0">
        {user ? (
          <div className="flex gap-2">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              placeholder="Написать комментарий..."
              className="flex-1 bg-white/5 border border-white/10 text-white placeholder:text-white/30 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-white/30"
            />
            <button onClick={handleSend} disabled={sending || !text.trim()} className="bg-white text-black rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-white/90 transition-colors">
              <Icon name="Send" size={16} />
            </button>
          </div>
        ) : (
          <button onClick={() => navigate("/login")} className="w-full py-2.5 text-sm text-white/50 border border-white/10 rounded-xl hover:border-white/20 hover:text-white transition-colors">
            Войди, чтобы комментировать
          </button>
        )}
      </div>
    </div>
  );
}

function ShotCard({ shot, onLike, onDelete, user }: {
  shot: Shot;
  onLike: (id: number) => void;
  onDelete: (id: number) => void;
  user: { id: number; artist_name: string } | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [viewed, setViewed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().then(() => setPlaying(true)).catch(() => {});
          if (!viewed) { api.shots.view(shot.id); setViewed(true); }
        } else {
          videoRef.current?.pause(); setPlaying(false);
        }
      },
      { threshold: 0.7 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [shot.id, viewed]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) { videoRef.current.pause(); setPlaying(false); }
    else { videoRef.current.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const shareUrl = `${window.location.origin}/shots`;
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: shot.title, text: `${shot.artist_name}: ${shot.title}`, url: shareUrl });
    } else {
      navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div ref={cardRef} className="relative bg-black rounded-2xl overflow-hidden" style={{ height: "calc(100svh - 120px)", minHeight: 500, maxHeight: 800 }}>
      {/* Видео */}
      <video
        ref={videoRef}
        src={shot.video_url}
        poster={shot.thumbnail_url || undefined}
        loop
        muted={muted}
        playsInline
        onClick={togglePlay}
        className="absolute inset-0 w-full h-full object-cover cursor-pointer"
      />

      {/* Оверлей паузы */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <Icon name="Play" size={28} className="text-white ml-1" />
          </div>
        </div>
      )}

      {/* Инфо снизу слева */}
      <div className="absolute bottom-0 left-0 right-12 p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold backdrop-blur-sm shrink-0">
            {shot.artist_name[0]?.toUpperCase()}
          </div>
          <span className="font-semibold text-sm text-white drop-shadow">{shot.artist_name}</span>
        </div>
        <p className="text-white font-semibold text-sm drop-shadow">{shot.title}</p>
        {shot.description && <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{shot.description}</p>}
        <div className="flex items-center gap-3 mt-2 text-white/50 text-xs">
          <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{shot.views}</span>
        </div>
      </div>

      {/* Кнопки справа */}
      <div className="absolute right-3 bottom-20 flex flex-col items-center gap-5">
        <button onClick={() => onLike(shot.id)} className="flex flex-col items-center gap-1 group">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${shot.liked ? "bg-red-500" : "bg-black/50 backdrop-blur-sm group-hover:bg-white/20"}`}>
            <Icon name="Heart" size={22} className={shot.liked ? "text-white" : "text-white"} />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">{shot.likes_count}</span>
        </button>

        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
            <Icon name="MessageCircle" size={22} className="text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">{shot.comments_count}</span>
        </button>

        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
            <Icon name="Share2" size={20} className="text-white" />
          </div>
          <span className="text-white text-xs font-medium drop-shadow">Поделиться</span>
        </button>

        <button onClick={() => setMuted(m => !m)} className="flex flex-col items-center gap-1">
          <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
            <Icon name={muted ? "VolumeX" : "Volume2"} size={20} className="text-white" />
          </div>
        </button>

        {shot.is_owner && (
          <button onClick={() => onDelete(shot.id)} className="flex flex-col items-center gap-1">
            <div className="w-11 h-11 rounded-full bg-red-500/30 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/60 transition-colors">
              <Icon name="Trash2" size={18} className="text-red-300" />
            </div>
          </button>
        )}
      </div>

      {/* Комментарии */}
      {showComments && (
        <CommentsPanel shot={shot} onClose={() => setShowComments(false)} user={user} />
      )}
    </div>
  );
}

export default function Shots() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shots, setShots] = useState<Shot[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const offset = useRef(0);

  const loadMore = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return;
    const res = await api.shots.feed(`&limit=10&offset=${reset ? 0 : offset.current}`);
    const fetched: Shot[] = res.shots || [];
    if (reset) { setShots(fetched); offset.current = fetched.length; }
    else { setShots(p => [...p, ...fetched]); offset.current += fetched.length; }
    if (fetched.length < 10) setHasMore(false);
    setLoading(false);
  }, [hasMore]);

  useEffect(() => { loadMore(true); }, []);

  const handleLike = async (id: number) => {
    if (!user) { navigate("/login"); return; }
    const res = await api.shots.like(id);
    if (res.likes_count !== undefined) {
      setShots(p => p.map(s => s.id === id ? { ...s, liked: res.liked, likes_count: res.likes_count } : s));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить видео?")) return;
    await api.shots.delete(id);
    setShots(p => p.filter(s => s.id !== id));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Хедер */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent">
        <a href="/" className="text-white/70 hover:text-white transition-colors">
          <Icon name="ArrowLeft" size={22} />
        </a>
        <h1 className="font-bold text-lg tracking-tight">Видеошоты</h1>
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={() => setUploadOpen(true)}
              className="flex items-center gap-1.5 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white/90 transition-colors"
            >
              <Icon name="Plus" size={14} />
              Загрузить
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="text-xs font-medium text-white/60 border border-white/20 px-3 py-1.5 rounded-full hover:text-white hover:border-white/40 transition-colors"
            >
              Войти
            </button>
          )}
        </div>
      </div>

      {/* Лента */}
      <div className="pt-14 pb-4 px-3 max-w-sm mx-auto space-y-4">
        {loading && (
          <div className="flex items-center justify-center" style={{ height: "calc(100svh - 120px)" }}>
            <div className="flex flex-col items-center gap-3 text-white/40">
              <Icon name="Loader2" size={32} className="animate-spin" />
              <span className="text-sm">Загружаем видео...</span>
            </div>
          </div>
        )}

        {!loading && shots.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center" style={{ height: "calc(100svh - 120px)" }}>
            <Icon name="Video" size={56} className="text-white/20 mb-4" />
            <p className="text-white/60 font-semibold text-lg mb-1">Видео пока нет</p>
            <p className="text-white/30 text-sm mb-6">Будь первым — загрузи свой видеошот!</p>
            {user && (
              <button
                onClick={() => setUploadOpen(true)}
                className="bg-white text-black font-bold px-6 py-3 rounded-full hover:bg-white/90 transition-colors"
              >
                Загрузить видео
              </button>
            )}
          </div>
        )}

        {shots.map(shot => (
          <ShotCard
            key={shot.id}
            shot={shot}
            onLike={handleLike}
            onDelete={handleDelete}
            user={user}
          />
        ))}

        {hasMore && !loading && shots.length > 0 && (
          <button
            onClick={() => loadMore()}
            className="w-full py-4 text-white/40 hover:text-white/70 text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Icon name="ChevronDown" size={18} />
            Загрузить ещё
          </button>
        )}
      </div>

      {uploadOpen && (
        <UploadModal
          onClose={() => setUploadOpen(false)}
          onUploaded={(shot) => { setShots(p => [shot, ...p]); }}
        />
      )}
    </div>
  );
}