import { useRef, useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const achievements = [
  { icon: "Headphones", label: "Лет в индустрии", value: "8" },
  { icon: "Music", label: "Выпущенных треков", value: "200+" },
  { icon: "Mic2", label: "Продвинутых артистов", value: "50+" },
  { icon: "Award", label: "Успешных кейсов", value: "100+" },
];

const AboutSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} id="about" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div
          className={`grid md:grid-cols-2 gap-12 items-center transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-neon-violet/30 via-neon-fuchsia/20 to-transparent rounded-[2rem] blur-2xl" />
            <div className="w-full aspect-square rounded-[2rem] relative z-10 overflow-hidden glass-card">
              <img
                src="https://cdn.poehali.dev/projects/49f0dfee-d362-48aa-ab1c-67bc8f7671ea/bucket/32d4d682-6dd2-4faf-8c6c-e1f66581c207.jpg"
                alt="Александр Балашов — продюсер Калашников Саунд"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent px-6 py-6">
                <p className="text-white font-display font-bold text-xl">Александр Балашов</p>
                <p className="text-white/60 text-sm">Продюсер · Калашников Саунд</p>
              </div>
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-semibold text-white/70 tracking-wide uppercase">
              О лейбле
            </div>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white">
              Александр <span className="gradient-text">Балашов</span>
            </h2>
            <p className="text-lg mb-5 text-white/60 leading-relaxed">
              Генеральный директор и продюсер лейбла Калашников Саунд. 8 лет в музыкальной
              индустрии — от создания звука до полноценного продвижения артистов на рынке.
            </p>
            <p className="text-lg mb-8 text-white/60 leading-relaxed">
              Помогаю артистам не только звучать профессионально, но и строить карьеру: разрабатываю
              маркетинговые стратегии, выстраиваю присутствие в соцсетях и вывожу на широкую аудиторию.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {achievements.map((achievement, index) => (
                <div
                  key={achievement.label}
                  className={`glass-card glass-card-hover rounded-2xl p-4 transition-all duration-500 ${
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center mb-2">
                    <div className="mr-2 text-neon-fuchsia"><Icon name={achievement.icon} size={20} /></div>
                    <div className="text-2xl font-display font-bold text-white">{achievement.value}</div>
                  </div>
                  <div className="text-sm text-white/50">{achievement.label}</div>
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
