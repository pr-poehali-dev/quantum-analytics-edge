import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/ui/icon";

interface MyShot {
  id: number;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  views: number;
  likes: number;
  comments: number;
  created_at: string;
}

export default function ShotsPanel() {
  const [shots, setShots] = useState<MyShot[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    api.shots.myStats().then(r => {
      setShots(r.shots || []);
      setTotalViews(r.total_views || 0);
      setTotalLikes(r.total_likes || 0);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Удалить видеошот?")) return;
    setDeletingId(id);
    await api.shots.delete(id);
    setShots(p => {
      const updated = p.filter(s => s.id !== id);
      const removed = p.find(s => s.id === id);
      if (removed) {
        setTotalViews(v => v - (removed.views || 0));
        setTotalLikes(l => l - (removed.likes || 0));
      }
      return updated;
    });
    setDeletingId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20 text-slate-500">
      <Icon name="Loader2" size={24} className="animate-spin" />
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Статистика */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Видео", value: shots.length, icon: "Video" },
          { label: "Просмотры", value: totalViews, icon: "Eye" },
          { label: "Лайки", value: totalLikes, icon: "Heart" },
        ].map(s => (
          <div key={s.label} className="bg-[#1a2636] border border-white/5 rounded-2xl p-4 text-center">
            <Icon name={s.icon as "Video"} size={20} className="text-[#f5a623] mx-auto mb-2" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Кнопка перехода */}
      <a
        href="/shots"
        className="flex items-center justify-center gap-2 w-full py-3 bg-[#f5a623] text-black font-bold rounded-xl hover:bg-[#f5a623]/90 transition-colors text-sm"
      >
        <Icon name="Play" size={16} />
        Перейти в Видеошоты
      </a>

      {/* Список видео */}
      {shots.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Icon name="Video" size={48} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Видеошотов пока нет</p>
          <a href="/shots" className="inline-block mt-3 text-[#f5a623] text-sm hover:opacity-80 transition-opacity">
            Загрузить первое видео →
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-300 text-sm">Мои видео ({shots.length})</h4>
          {shots.map(shot => (
            <div key={shot.id} className="bg-[#1a2636] border border-white/5 rounded-xl p-4 flex gap-4 items-center">
              {/* Превью */}
              <div className="w-16 h-16 rounded-lg bg-black/50 flex items-center justify-center shrink-0 overflow-hidden">
                {shot.thumbnail_url ? (
                  <img src={shot.thumbnail_url} alt={shot.title} className="w-full h-full object-cover" />
                ) : (
                  <Icon name="Video" size={24} className="text-slate-600" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{shot.title}</p>
                <div className="flex items-center gap-3 mt-1.5 text-slate-500 text-xs">
                  <span className="flex items-center gap-1"><Icon name="Eye" size={11} />{shot.views}</span>
                  <span className="flex items-center gap-1"><Icon name="Heart" size={11} />{shot.likes}</span>
                  <span className="flex items-center gap-1"><Icon name="MessageCircle" size={11} />{shot.comments}</span>
                </div>
                <p className="text-slate-600 text-xs mt-1">
                  {new Date(shot.created_at).toLocaleDateString("ru", { day: "numeric", month: "short" })}
                </p>
              </div>

              <button
                onClick={() => handleDelete(shot.id)}
                disabled={deletingId === shot.id}
                className="text-slate-600 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
              >
                <Icon name={deletingId === shot.id ? "Loader2" : "Trash2"} size={16} className={deletingId === shot.id ? "animate-spin" : ""} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
