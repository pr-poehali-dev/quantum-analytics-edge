import { useRef, useEffect, useState } from "react";
import { Headphones, Music, Mic2, Award } from "lucide-react";

const achievements = [
  { icon: <Headphones className="w-6 h-6" />, label: "Лет в индустрии", value: "10+" },
  { icon: <Music className="w-6 h-6" />, label: "Выпущенных треков", value: "200+" },
  { icon: <Mic2 className="w-6 h-6" />, label: "Продвинутых артистов", value: "50+" },
  { icon: <Award className="w-6 h-6" />, label: "Успешных кейсов", value: "100+" },
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
            <div className="w-full aspect-square rounded-3xl relative z-10 overflow-hidden">
              <img
                src="https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/32d4d682-6dd2-4faf-8c6c-e1f66581c207.jpg"
                alt="Александр Балашов — продюсер Калашников Саунд"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-6 py-5">
                <p className="text-white font-semibold text-lg">Александр Балашов</p>
                <p className="text-zinc-400 text-sm">Продюсер · Калашников Саунд</p>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">Александр Балашов</h2>
            <p className="text-lg mb-6 text-zinc-300">
              Генеральный директор и продюсер лейбла Калашников Саунд. Более 10 лет в музыкальной
              индустрии — от создания звука до полноценного продвижения артистов на рынке.
            </p>
            <p className="text-lg mb-8 text-zinc-300">
              Помогаю артистам не только звучать профессионально, но и строить карьеру: разрабатываю
              маркетинговые стратегии, выстраиваю присутствие в соцсетях и вывожу на широкую аудиторию.
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