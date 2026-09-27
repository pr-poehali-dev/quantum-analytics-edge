import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Disc3, Music2, AudioWaveform, Radio, Headphones, Mic2 } from "lucide-react";

const floatingIcons = [
  { icon: <Music2 className="w-7 h-7" />, top: "12%", left: "8%", delay: "0s", duration: "7s" },
  { icon: <Disc3 className="w-8 h-8" />, top: "20%", left: "88%", delay: "0.6s", duration: "8s" },
  { icon: <Radio className="w-6 h-6" />, top: "68%", left: "5%", delay: "1.2s", duration: "9s" },
  { icon: <Headphones className="w-7 h-7" />, top: "75%", left: "90%", delay: "0.3s", duration: "7.5s" },
  { icon: <Mic2 className="w-6 h-6" />, top: "8%", left: "48%", delay: "1.8s", duration: "8.5s" },
  { icon: <AudioWaveform className="w-6 h-6" />, top: "85%", left: "45%", delay: "0.9s", duration: "6.5s" },
];

const HeroSection = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      const opacity = Math.max(0, 1 - scrolled / (windowHeight * 0.5));
      setScrollOpacity(opacity);
      setScrollY(scrolled * 0.5);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const stats = [
    { icon: <Play className="w-6 h-6" />, label: "Продвинутых артистов", value: "50+" },
    { icon: <Disc3 className="w-6 h-6" />, label: "Выпущенных треков", value: "200+" },
    { icon: <Music2 className="w-6 h-6" />, label: "Лет в музыкальной индустрии", value: "8" },
    { icon: <AudioWaveform className="w-6 h-6" />, label: "Успешных кейсов", value: "100+" },
  ];

  return (
    <section ref={containerRef} className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 to-black"></div>
        {floatingIcons.map((item, index) => (
          <div
            key={index}
            className="absolute text-white/10 animate-float-icon hidden md:block"
            style={{
              top: item.top,
              left: item.left,
              animationDelay: item.delay,
              animationDuration: item.duration,
            }}
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ transform: `translateY(${scrollY}px)`, opacity: scrollOpacity }}
        className="relative pt-40 pb-16 px-4 transition-opacity duration-100 flex items-center min-h-screen"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-bold mb-6 tracking-tight relative">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                Калашников Саунд
              </span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-zinc-400 max-w-3xl mx-auto">
              Продюсирование и продвижение артистов от Александра Балашова. Помогаем талантам выйти
              на новый уровень — от создания звука до полноценного маркетинга в музыкальной индустрии.
            </p>
            <div className="relative inline-block">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 text-lg px-8 py-6 rounded-full transition-all duration-300 hover:scale-105"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                asChild
              >
                <a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  <span className="relative z-10">Обсудить проект</span>
                  <span
                    className={`ml-2 relative z-10 transition-transform duration-200 ${
                      isHovered ? "translate-x-1" : ""
                    }`}
                  >
                    &rarr;
                  </span>
                </a>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="text-center animate-fade-in"
                style={{ animationDelay: `${0.2 + index * 0.1}s` }}
              >
                <div className="bg-zinc-900/50 rounded-xl p-6 backdrop-blur-lg border border-white/10 transition-all duration-300 hover:scale-105 hover:border-white/20">
                  <div className="mb-2 text-white/70 flex justify-center">{stat.icon}</div>
                  <div className="text-3xl font-bold mb-1 text-white">{stat.value}</div>
                  <div className="text-sm text-zinc-400">{stat.label}</div>
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