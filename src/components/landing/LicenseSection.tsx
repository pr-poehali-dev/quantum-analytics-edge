import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

interface LicenseOption {
  name: string;
  price: string;
  icon: string;
  features: string[];
  bulkDeal?: string;
  popular?: boolean;
}

const licenseOptions: LicenseOption[] = [
  {
    name: "Продюсирование",
    price: "от 5 000 ₽",
    icon: "Star",
    features: [
      "Разработка концепции артиста",
      "Создание и запись трека",
      "Профессиональный сведение и мастеринг",
      "Консультация по имиджу",
      "Подготовка к релизу",
    ],
    bulkDeal: "ПЕРВАЯ КОНСУЛЬТАЦИЯ — БЕСПЛАТНО!",
  },
  {
    name: "Маркетинг",
    price: "от 10 000 ₽",
    icon: "Zap",
    features: [
      "Стратегия продвижения артиста",
      "Ведение социальных сетей",
      "Реклама и таргетинг",
      "PR и работа со СМИ",
      "Аналитика и отчётность",
      "Питчинг на плейлисты",
    ],
    popular: true,
  },
  {
    name: "Полный цикл",
    price: "от 20 000 ₽",
    icon: "Crown",
    features: [
      "Продюсирование + маркетинг",
      "Создание артист-бренда",
      "Разработка визуального стиля",
      "Организация съёмок клипа",
    ],
  },
  {
    name: "Лейбл-партнёрство",
    price: "Индивидуально",
    icon: "Globe",
    features: [
      "Долгосрочное сотрудничество",
      "Поддержка от Калашников Саунд",
      "Дистрибуция по всем платформам",
      "Юридическая поддержка",
      "Авторские права и лицензирование",
      "Персональный менеджер",
    ],
  },
];

const LicenseSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="licenses" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 relative">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-semibold text-white/70 tracking-wide uppercase">
            Услуги
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 text-white">
            Наши <span className="gradient-text">услуги</span>
          </h2>
          <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto">
            Помогаем артистам выйти на новый уровень — от профессионального звука до
            полноценного продвижения в музыкальной индустрии
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {licenseOptions.map((option, index) => (
            <div
              key={option.name}
              className={`relative transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {option.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-gradient-to-r from-neon-violet to-neon-fuchsia text-white px-4 py-1 rounded-full text-xs font-semibold tracking-wide">
                    ПОПУЛЯРНЫЙ
                  </span>
                </div>
              )}
              <div
                className={`relative h-full rounded-3xl p-6 flex flex-col glass-card glass-card-hover ${
                  option.popular ? "neon-border" : ""
                }`}
              >
                <div className="text-center mb-6">
                  <div className="inline-flex p-3 rounded-2xl glass mb-4 text-neon-fuchsia">
                    <Icon name={option.icon} size={24} />
                  </div>
                  <h3 className="text-xl font-display font-bold mb-2 text-white">{option.name}</h3>
                  <div className="text-2xl font-display font-bold gradient-text">{option.price}</div>
                </div>

                <div className="flex-grow">
                  <ul className="space-y-3 mb-6">
                    {option.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <Icon name="Check" size={18} className="text-neon-fuchsia mr-2 shrink-0 mt-0.5" />
                        <span className="text-sm text-white/60">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {option.bulkDeal && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-white glass rounded-xl py-2 px-3 text-center">
                      {option.bulkDeal}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-neon-violet to-neon-fuchsia hover:opacity-90 transition-opacity"
                >
                  Обсудить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LicenseSection;
