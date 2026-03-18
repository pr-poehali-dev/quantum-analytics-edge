import { useRef, useEffect, useState } from "react";
import { Headphones, Music, Mic2, Award } from "lucide-react";

const achievements = [
  { icon: <Headphones className="w-6 h-6" />, label: "Лет опыта", value: "10+" },
  { icon: <Music className="w-6 h-6" />, label: "Созданных треков", value: "500+" },
  { icon: <Mic2 className="w-6 h-6" />, label: "Коллабораций с артистами", value: "100+" },
  { icon: <Award className="w-6 h-6" />, label: "Наград", value: "15+" },
];

const AboutSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const progress = Math.max(0, Math.min(1, 1 - rect.top / windowHeight));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section ref={ref} id="about" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-700 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
          style={{ transform: `translateY(${(1 - scrollProgress) * 50}px)` }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-white/0 rounded-3xl transform -rotate-6"></div>
            <div className="w-full aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl relative z-10 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Music className="w-16 h-16 text-white" />
                </div>
                <p className="text-zinc-400 text-lg">Фото продюсера</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">О SoundForge</h2>
            <p className="text-lg mb-6 text-zinc-300">
              SoundForge — это не просто битмейкер, это звуковой архитектор, создающий саундскейпы
              будущего. С десятилетним опытом и чутким слухом на инновации, SoundForge раздвигает
              границы возможного в музыкальном продакшене.
            </p>
            <p className="text-lg mb-8 text-zinc-300">
              От хитов в чартах до андеграундных гимнов — универсальный стиль и внимание к деталям
              гарантируют, что каждый бит — это не просто трек, а путешествие, ждущее правильного
              артиста.
            </p>
            <div className="grid grid-cols-2 gap-6">
              {achievements.map((achievement, index) => (
                <div
                  key={achievement.label}
                  className={`bg-zinc-900/50 rounded-lg p-4 border border-white/10 transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center mb-2">
                    <div className="mr-2 text-white">{achievement.icon}</div>
                    <div className="text-2xl font-bold text-white">{achievement.value}</div>
                  </div>
                  <div className="text-sm text-zinc-400">{achievement.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
