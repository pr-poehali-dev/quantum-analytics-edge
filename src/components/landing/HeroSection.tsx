import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      setScrollOpacity(Math.max(0, 1 - scrolled / (windowHeight * 0.5)));
      setScrollY(scrolled * 0.4);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stats = [
    { icon: "Mic2", label: "Продвинутых артистов", value: "50+" },
    { icon: "Disc3", label: "Выпущенных треков", value: "200+" },
    { icon: "Sparkles", label: "Лет в индустрии", value: "8" },
    { icon: "TrendingUp", label: "Успешных кейсов", value: "100+" },
  ];

  return (
    <section ref={containerRef} className="min-h-screen relative overflow-hidden flex items-center">
      <div
        style={{ transform: `translateY(${scrollY}px)`, opacity: scrollOpacity }}
        className="relative pt-32 pb-16 px-4 w-full"
      >
        <div className="max-w-6xl mx-auto text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-8 text-xs font-semibold text-white/70 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-fuchsia animate-pulse" />
              Музыкальный лейбл нового поколения
            </div>

            <h1 className="text-6xl md:text-8xl font-display font-black mb-6 tracking-tight leading-[0.95]">
              <span className="gradient-text">Калашников</span>
              <br />
              <span className="text-white">Саунд</span>
            </h1>

            <p className="text-lg md:text-xl mb-10 text-white/60 max-w-2xl mx-auto leading-relaxed">
              Продюсирование и продвижение артистов от Александра Балашова. Помогаем талантам
              выйти на новый уровень — от создания звука до полноценного маркетинга.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#contact"
                onClick={(e) => { e.preventDefault(); document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" }); }}
                className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-neon-violet via-neon-fuchsia to-neon-violet bg-[length:200%_auto] hover:bg-right transition-all duration-500 glow-violet hover:scale-105 hover:shadow-[0_0_45px_-8px_hsl(var(--neon-fuchsia)/0.9)] active:scale-95"
              >
                Обсудить проект
                <Icon name="ArrowRight" size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
              </a>
              <a
                href="#artists"
                onClick={(e) => { e.preventDefault(); document.getElementById("artists")?.scrollIntoView({ behavior: "smooth" }); }}
                className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white glass-card glass-card-hover transition-all duration-300 hover:scale-105 active:scale-95"
              >
                Наши артисты
                <Icon name="ChevronDown" size={18} className="group-hover:translate-y-0.5 transition-transform duration-300" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto mt-20">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="animate-fade-in"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="glass-card glass-card-hover rounded-2xl p-5 md:p-6">
                  <div className="mb-3 text-neon-fuchsia flex justify-center">
                    <Icon name={stat.icon} size={26} />
                  </div>
                  <div className="text-2xl md:text-3xl font-display font-bold mb-1 text-white">{stat.value}</div>
                  <div className="text-xs md:text-sm text-white/50">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;