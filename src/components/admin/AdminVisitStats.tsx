import Icon from "@/components/ui/icon";

interface VisitStats {
  online: number;
  today: number;
  week: number;
  month: number;
  top_pages: { page: string; visits: number }[];
  daily: { date: string; visits: number }[];
}

interface Props {
  visitStats: VisitStats | null;
}

export default function AdminVisitStats({ visitStats }: Props) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6">Посещаемость сайта</h2>
      {!visitStats ? (
        <p className="text-zinc-500 text-sm">Загрузка статистики...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Онлайн (1ч)", value: visitStats.online, icon: "Wifi", color: "text-green-400" },
              { label: "Сегодня", value: visitStats.today, icon: "Sun", color: "text-yellow-400" },
              { label: "За 7 дней", value: visitStats.week, icon: "Calendar", color: "text-blue-400" },
              { label: "За 30 дней", value: visitStats.month, icon: "TrendingUp", color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="bg-zinc-900 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={s.icon} size={16} className={s.color} />
                  <p className="text-zinc-400 text-xs">{s.label}</p>
                </div>
                <p className="text-3xl font-bold">{s.value.toLocaleString("ru")}</p>
              </div>
            ))}
          </div>

          {visitStats.daily.length > 0 && (
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-semibold mb-4 text-zinc-300">Посещения за 14 дней</p>
              <div className="flex items-end gap-1 h-24">
                {visitStats.daily.map((d) => {
                  const max = Math.max(...visitStats.daily.map((x) => x.visits), 1);
                  const h = Math.max((d.visits / max) * 100, 4);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                        {d.visits} — {d.date.slice(5)}
                      </div>
                      <div className="w-full bg-white/80 rounded-sm" style={{ height: `${h}%` }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {visitStats.top_pages.length > 0 && (
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-4">
              <p className="text-sm font-semibold mb-3 text-zinc-300">Топ страниц (7 дней)</p>
              <div className="space-y-2">
                {visitStats.top_pages.map((p) => {
                  const max = visitStats.top_pages[0]?.visits || 1;
                  return (
                    <div key={p.page} className="flex items-center gap-3">
                      <p className="text-sm text-zinc-300 w-32 shrink-0 truncate">{p.page || "/"}</p>
                      <div className="flex-1 bg-zinc-800 rounded-full h-2">
                        <div className="bg-white rounded-full h-2" style={{ width: `${(p.visits / max) * 100}%` }} />
                      </div>
                      <p className="text-sm font-medium w-10 text-right">{p.visits}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <p className="text-zinc-600 text-xs">← Выбери артиста слева для работы с его материалами</p>
        </div>
      )}
    </div>
  );
}
