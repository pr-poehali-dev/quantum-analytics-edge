import { useState, useRef, useEffect } from "react";
import { Crown, Zap, Star, Globe, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LicenseOption {
  name: string;
  price: string;
  icon: React.ReactNode;
  features: string[];
  bulkDeal?: string;
  popular?: boolean;
}

const licenseOptions: LicenseOption[] = [
  {
    name: "Продюсирование",
    price: "от 5 000 ₽",
    icon: <Star className="w-5 h-5" />,
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
    icon: <Zap className="w-5 h-5" />,
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
    icon: <Crown className="w-5 h-5" />,
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
    icon: <Globe className="w-5 h-5" />,
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
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="licenses" className="py-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-900/20 to-black"></div>

      <div className="container mx-auto px-4 relative max-w-4xl">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white">Наши услуги</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Помогаем артистам выйти на новый уровень — от профессионального звука до
            полноценного продвижения в музыкальной индустрии
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {licenseOptions.map((option, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={option.name}
                className={`transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div
                  className={`relative rounded-2xl border transition-colors duration-300 ${
                    isOpen ? "border-white/30 bg-white/5" : "border-white/10 bg-black/40 hover:border-white/20"
                  }`}
                >
                  {option.popular && (
                    <div className="absolute -top-3 left-6 z-10">
                      <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-semibold">
                        Популярный
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between gap-4 p-6 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="inline-flex p-3 rounded-full bg-zinc-900 border border-white/10 text-white shrink-0">
                        {option.icon}
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-white">{option.name}</h3>
                        <p className="text-zinc-400 text-sm md:text-base">{option.price}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-white/70">
                      {isOpen ? <Minus className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </div>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6">
                        <div className="h-px bg-white/10 mb-5" />
                        <ul className="space-y-3 mb-5">
                          {option.features.map((feature, i) => (
                            <li key={i} className="flex items-start">
                              <span className="w-1.5 h-1.5 rounded-full bg-white/50 mr-3 mt-2 shrink-0" />
                              <span className="text-sm text-zinc-300">{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {option.bulkDeal && (
                          <div className="mb-5">
                            <p className="text-sm font-semibold text-white bg-white/5 py-2 px-3 rounded-lg border border-white/10">
                              {option.bulkDeal}
                            </p>
                          </div>
                        )}

                        <Button
                          className="w-full sm:w-auto bg-white text-black hover:bg-zinc-200 transition-colors"
                          onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                          Обсудить
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LicenseSection;
