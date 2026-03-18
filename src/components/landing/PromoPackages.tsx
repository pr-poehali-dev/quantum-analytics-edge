import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

const PACKAGES = [
  {
    id: "minimal",
    name: "Минимальный",
    price: "5 000 ₽",
    streams: "10 000",
    description: "Подходит начинающим артистам и новым релизам. Идеально для старта карьеры музыканта.",
    color: "border-zinc-700",
    badge: null,
  },
  {
    id: "medium",
    name: "Средний",
    price: "10 000 ₽",
    streams: "30 000",
    description: "Для тех, кто хочет выйти на новую аудиторию. Увеличьте узнаваемость среди слушателей.",
    color: "border-blue-500/40",
    badge: null,
  },
  {
    id: "confident",
    name: "Уверенный",
    price: "15 000 ₽",
    streams: "50 000",
    description: "Ваш трек услышат десятки тысяч поклонников! Уверенно заявите о себе в музыкальной индустрии.",
    color: "border-purple-500/40",
    badge: "Популярный",
  },
  {
    id: "professional",
    name: "Профессиональный",
    price: "20 000 ₽",
    streams: "100 000+",
    description: "Идеален для артистов, стремящихся покорять вершины чартов. Заметное увеличение фанбазы.",
    color: "border-yellow-500/40",
    badge: "Топ",
  },
];

export default function PromoPackages() {
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", track: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    if (!selected) return;
    if (!form.name.trim() || !form.contact.trim()) { setError("Укажите имя и контакт"); return; }
    setError("");
    setLoading(true);
    try {
      const res = await api.packages.pay({
        package: selected,
        name: form.name,
        contact: form.contact,
        track: form.track,
        return_url: window.location.origin + "/?payment=success",
      });
      if (res.payment_url) {
        window.location.href = res.payment_url;
      } else {
        setError(res.error || "Ошибка создания платежа");
      }
    } catch {
      setError("Не удалось создать платёж. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="promo-packages" className="py-20 relative overflow-hidden bg-zinc-950">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black" />
      <div className="container mx-auto px-4 relative">
        <div className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest text-zinc-400 uppercase mb-3 block">Продвижение</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Пакеты продвижения</h2>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Комплекс мер по привлечению целевой аудитории, оптимизация профиля артиста и распространение контента на популярных музыкальных площадках
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelected(selected === pkg.id ? null : pkg.id)}
              className={`relative text-left rounded-2xl border p-6 transition-all duration-300 ${pkg.color} ${
                selected === pkg.id
                  ? "bg-white/10 scale-105 shadow-lg shadow-white/5"
                  : "bg-black/60 hover:bg-white/5"
              }`}
            >
              {pkg.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                  {pkg.badge}
                </span>
              )}
              <div className="mb-4">
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-1">{pkg.name}</p>
                <p className="text-3xl font-bold text-white">{pkg.price}</p>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <p className="text-green-400 font-semibold text-sm">от {pkg.streams} прослушиваний</p>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed">{pkg.description}</p>
              {selected === pkg.id && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-white text-xs font-semibold">✓ Выбран</p>
                </div>
              )}
            </button>
          ))}
        </div>

        {selected && (
          <div className="max-w-lg mx-auto bg-zinc-900 border border-white/10 rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-white">
              Оформление: {PACKAGES.find(p => p.id === selected)?.name} пакет
            </h3>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ваше имя / псевдоним артиста"
              className="bg-black border-white/10 text-white placeholder:text-zinc-600"
            />
            <Input
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
              placeholder="Telegram, email или телефон"
              className="bg-black border-white/10 text-white placeholder:text-zinc-600"
            />
            <Input
              value={form.track}
              onChange={(e) => setForm({ ...form, track: e.target.value })}
              placeholder="Название трека или ссылка (необязательно)"
              className="bg-black border-white/10 text-white placeholder:text-zinc-600"
            />
            {error && (
              <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}
            <Button
              onClick={handlePay}
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 font-semibold text-base py-5"
            >
              {loading ? "Создаю платёж..." : `Оплатить ${PACKAGES.find(p => p.id === selected)?.price}`}
            </Button>
            <p className="text-zinc-600 text-xs text-center">Безопасная оплата через ЮКасса. После оплаты с вами свяжется менеджер лейбла.</p>
          </div>
        )}
      </div>
    </section>
  );
}