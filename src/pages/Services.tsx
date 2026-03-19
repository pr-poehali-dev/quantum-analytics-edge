import Icon from "@/components/ui/icon";

const services = [
  {
    icon: "Waves",
    title: "Бит на заказ",
    price: "от 3 000 ₽",
    color: "from-purple-600/20 to-purple-900/10",
    accent: "text-purple-400",
    border: "border-purple-500/20 hover:border-purple-500/50",
    description: "Авторский бит под твой стиль и жанр. Trap, drill, phonk, R&B, pop — любое направление. Передача всех прав.",
    features: ["Уникальная мелодия", "Передача прав", "2 правки включено", "Формат WAV + stems"],
  },
  {
    icon: "Sliders",
    title: "Сведение трека",
    price: "от 2 500 ₽",
    color: "from-blue-600/20 to-blue-900/10",
    accent: "text-blue-400",
    border: "border-blue-500/20 hover:border-blue-500/50",
    description: "Профессиональное сведение для достижения мощного и чистого звука. Балансировка, EQ, компрессия, эффекты.",
    features: ["До 30 дорожек", "Стерео мастер WAV", "1 правка включено", "Срок 3–5 дней"],
  },
  {
    icon: "Zap",
    title: "Мастеринг",
    price: "от 1 500 ₽",
    color: "from-yellow-600/20 to-yellow-900/10",
    accent: "text-yellow-400",
    border: "border-yellow-500/20 hover:border-yellow-500/50",
    description: "Финальная обработка для стриминга и радио. Громкость, динамика, яркость по стандартам Spotify, Apple Music.",
    features: ["Стандарты LUFS", "WAV + MP3 320", "Для всех платформ", "Срок 1–2 дня"],
  },
  {
    icon: "Globe",
    title: "Дистрибьюция",
    price: "от 1 000 ₽",
    color: "from-green-600/20 to-green-900/10",
    accent: "text-green-400",
    border: "border-green-500/20 hover:border-green-500/50",
    description: "Выпуск музыки на всех ключевых платформах мира. Spotify, Apple Music, VK Музыка, Яндекс Музыка и ещё 50+.",
    features: ["50+ платформ", "ISRC и UPC коды", "Роялти-отчёты", "Выпуск за 7–14 дней"],
  },
  {
    icon: "TrendingUp",
    title: "Продвижение",
    price: "от 5 000 ₽",
    color: "from-red-600/20 to-red-900/10",
    accent: "text-red-400",
    border: "border-red-500/20 hover:border-red-500/50",
    description: "Питчинг в плейлисты, реклама в соцсетях, блогеры. Гарантированное количество прослушиваний на твоих треках.",
    features: ["Яндекс Музыка питчинг", "Таргет в соцсетях", "Блогерские размещения", "Отчёт по результатам"],
  },
  {
    icon: "Mic2",
    title: "Запись вокала",
    price: "от 2 000 ₽",
    color: "from-pink-600/20 to-pink-900/10",
    accent: "text-pink-400",
    border: "border-pink-500/20 hover:border-pink-500/50",
    description: "Студийная запись вокала, рэпа, бэков в профессиональных условиях. Тюн, обработка, готовые дорожки.",
    features: ["Студийный микрофон", "Тюнинг и обработка", "WAV дорожки", "Почасовая аренда"],
  },
  {
    icon: "FileText",
    title: "Авторский договор",
    price: "от 500 ₽",
    color: "from-orange-600/20 to-orange-900/10",
    accent: "text-orange-400",
    border: "border-orange-500/20 hover:border-orange-500/50",
    description: "Юридически грамотный договор на передачу прав, лицензирование или совместное создание произведения.",
    features: ["Типовой или кастомный", "Электронная подпись", "Защита авторских прав", "Юридическая сила"],
  },
  {
    icon: "BarChart2",
    title: "Аналитика",
    price: "от 1 500 ₽",
    color: "from-cyan-600/20 to-cyan-900/10",
    accent: "text-cyan-400",
    border: "border-cyan-500/20 hover:border-cyan-500/50",
    description: "Детальный анализ статистики прослушиваний, аудитории и доходов с рекомендациями по развитию карьеры.",
    features: ["Все платформы", "Аудитория и демография", "Доходы и роялти", "Рекомендации"],
  },
];

export default function Services() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-black/95 backdrop-blur z-10">
        <a href="/" className="text-xl font-bold tracking-tighter">Калашников Саунд</a>
        <div className="flex items-center gap-4">
          <a href="/" className="text-zinc-400 hover:text-white text-sm transition-colors">← На главную</a>
          <a href="/login" className="text-zinc-400 hover:text-white text-sm transition-colors">Кабинет</a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <p className="text-zinc-500 text-sm uppercase tracking-widest mb-3 font-medium">KALASHNIKOV SOUND</p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-5">
            Наши услуги
          </h1>
          <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
            Всё для создания и продвижения твоей музыки — от битов до дистрибьюции на всех платформах мира
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-16">
          {services.map((s) => (
            <div
              key={s.title}
              className={`relative rounded-2xl border ${s.border} bg-gradient-to-br ${s.color} p-6 flex flex-col gap-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group`}
            >
              <div className={`w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center ${s.accent}`}>
                <Icon name={s.icon} size={24} />
              </div>

              <div>
                <h3 className="text-white font-bold text-lg leading-tight mb-1">{s.title}</h3>
                <p className={`font-semibold text-sm ${s.accent}`}>{s.price}</p>
              </div>

              <p className="text-zinc-400 text-sm leading-relaxed flex-1">{s.description}</p>

              <ul className="space-y-1.5">
                {s.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-zinc-400">
                    <div className={`w-1 h-1 rounded-full ${s.accent.replace("text-", "bg-")}`} />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href="/#demo"
                className={`mt-1 w-full text-center py-2.5 rounded-xl text-sm font-semibold border ${s.border} ${s.accent} hover:bg-white/5 transition-colors`}
              >
                Заказать →
              </a>
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 md:p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5">
            <Icon name="Headphones" size={28} className="text-white" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Нужна индивидуальная услуга?</h2>
          <p className="text-zinc-400 max-w-lg mx-auto mb-7">
            Напиши нам — обсудим твой проект и подберём оптимальное решение под любой бюджет
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/#demo"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-colors"
            >
              <Icon name="Send" size={16} />
              Написать нам
            </a>
            <a
              href="https://t.me/kalashnikov_sound"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 border border-white/20 text-white font-semibold rounded-full hover:border-white/50 transition-colors"
            >
              <Icon name="MessageCircle" size={16} />
              Telegram
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
