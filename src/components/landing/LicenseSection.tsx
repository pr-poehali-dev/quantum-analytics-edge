import { useState, useRef, useEffect } from "react";
import { Check, X, Crown, Zap, Star, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LicenseOption {
  name: string;
  price: string;
  icon: React.ReactNode;
  features: string[];
  notIncluded?: string[];
  bulkDeal?: string;
  popular?: boolean;
}

const licenseOptions: LicenseOption[] = [
  {
    name: "Продюсирование",
    price: "от 5 000 ₽",
    icon: <Star className="w-6 h-6" />,
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
    icon: <Zap className="w-6 h-6" />,
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
    icon: <Crown className="w-6 h-6" />,
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
    icon: <Globe className="w-6 h-6" />,
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
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
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

      <div className="container mx-auto px-4 relative">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6 text-white">Наши услуги</h2>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Помогаем артистам выйти на новый уровень — от профессионального звука до
            полноценного продвижения в музыкальной индустрии
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {licenseOptions.map((option, index) => (
            <div
              key={option.name}
              className={`transition-all duration-500 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <Card
                className={`relative h-full bg-black border-white/10 ${
                  hoveredCard === index ? "scale-105" : "scale-100"
                } transition-all duration-300`}
              >
                <div className="absolute inset-0 rounded-lg p-[1px] bg-gradient-to-br from-white/20 to-white/0">
                  <div className="absolute inset-0 rounded-lg bg-black"></div>
                </div>

                {option.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-white text-black px-4 py-1 rounded-full text-sm font-semibold animate-pulse">
                      Популярный
                    </span>
                  </div>
                )}

                <CardContent className="relative p-6 rounded-lg h-full flex flex-col">
                  <div className="text-center mb-6">
                    <div className="inline-flex p-3 rounded-full bg-zinc-900 border border-white/10 mb-4">
                      {option.icon}
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">{option.name}</h3>
                    <div className="text-3xl font-bold text-white">{option.price}</div>
                  </div>

                  <div className="flex-grow">
                    <ul className="space-y-3 mb-6">
                      {option.features.map((feature, i) => (
                        <li key={i} className="flex items-start">
                          <Check className="h-5 w-5 text-white mr-2 shrink-0 mt-0.5" />
                          <span className="text-sm text-zinc-300">{feature}</span>
                        </li>
                      ))}
                      {option.notIncluded?.map((feature, i) => (
                        <li key={i} className="flex items-start text-zinc-500">
                          <X className="h-5 w-5 text-zinc-500 mr-2 shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {option.bulkDeal && (
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-white bg-white/5 py-2 px-3 rounded-lg border border-white/10 animate-pulse">
                        {option.bulkDeal}
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full bg-white text-black hover:bg-zinc-200 transition-colors"
                    onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    Обсудить
                  </Button>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LicenseSection;