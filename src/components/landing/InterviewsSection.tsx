import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";
import { api } from "@/lib/api";

interface Interview {
  id: number;
  artist_name: string;
  artist_photo_url: string | null;
  question: string;
  answer: string;
  excerpt: string | null;
}

const InterviewsSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    api.beatstore.listInterviews()
      .then((r) => { setInterviews(r.interviews || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!loaded || interviews.length === 0) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.05 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [loaded, interviews.length]);

  if (!loaded || interviews.length === 0) return null;

  return (
    <section ref={ref} id="interviews" className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-semibold text-white/70 tracking-wide uppercase">
            От первого лица
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-4">
            Интервью лучших <span className="gradient-text">артистов лейбла</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Честные разговоры о музыке, творчестве и пути к успеху
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {interviews.map((item, index) => {
            const isOpen = openId === item.id;
            return (
              <div
                key={item.id}
                className={`glass-card glass-card-hover rounded-3xl p-6 md:p-7 transition-all duration-500 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${index * 80}ms` }}
              >
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden glass shrink-0">
                    {item.artist_photo_url ? (
                      <img src={item.artist_photo_url} alt={item.artist_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon name="Mic2" size={22} className="text-white/30" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-display font-bold text-lg leading-tight">{item.artist_name}</p>
                    <p className="text-neon-fuchsia text-xs uppercase tracking-wide">Артист лейбла</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-start gap-2 mb-3">
                    <Icon name="Quote" size={18} className="text-neon-violet shrink-0 mt-0.5" />
                    <p className="text-white font-semibold text-base leading-snug">{item.question}</p>
                  </div>
                  <p className={`text-white/60 text-sm leading-relaxed pl-6 ${isOpen ? "" : "line-clamp-3"}`}>
                    {isOpen ? item.answer : (item.excerpt || item.answer)}
                  </p>
                </div>

                {(item.excerpt || item.answer.length > 160) && (
                  <button
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="text-neon-cyan text-sm font-medium hover:text-neon-fuchsia transition-colors flex items-center gap-1 pl-6"
                  >
                    {isOpen ? "Свернуть" : "Читать полностью"}
                    <Icon name={isOpen ? "ChevronUp" : "ChevronDown"} size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default InterviewsSection;
