import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";

const DEMO_URL = "https://functions.poehali.dev/73d2e33e-564e-42ba-bcb2-46dc5cbc743c";

const DemoSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    genre: "",
    link: "",
    about: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    const res = await fetch(DEMO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    setIsSubmitting(false);

    if (res.ok) {
      setIsSubmitted(true);
      setTimeout(() => {
        setIsSubmitted(false);
        setFormData({ name: "", contact: "", genre: "", link: "", about: "" });
      }, 4000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ошибка отправки. Попробуйте ещё раз.");
    }
  };

  return (
    <section id="demo" ref={ref} className="py-24 relative overflow-hidden">
      <div
        className={`container mx-auto px-4 relative z-10 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6">
            <Icon name="Music" size={16} className="text-neon-fuchsia" />
            <span className="text-sm text-white/60">Отправить демо</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-white">
            Хочешь попасть <span className="gradient-text">на лейбл?</span>
          </h2>
          <p className="text-lg md:text-xl text-white/50 max-w-xl mx-auto">
            Отправь своё демо — мы послушаем каждого и свяжемся с теми, чьё творчество нас зацепит
          </p>
        </div>

        <div
          className={`max-w-lg mx-auto glass-card rounded-3xl p-8 transition-all duration-500 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {isSubmitted ? (
            <div className="text-center py-8">
              <Icon name="CheckCircle" size={64} className="text-neon-cyan mx-auto mb-4" />
              <h3 className="text-2xl font-display font-bold text-white mb-2">Демо отправлено!</h3>
              <p className="text-white/50">Мы получили твои материалы и скоро свяжемся с тобой.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="text"
                name="name"
                placeholder="Имя или псевдоним *"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Input
                type="text"
                name="contact"
                placeholder="Telegram или телефон для связи *"
                value={formData.contact}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Input
                type="text"
                name="genre"
                placeholder="Жанр / стиль"
                value={formData.genre}
                onChange={handleChange}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Input
                type="url"
                name="link"
                placeholder="Ссылка на демо (YouTube, SoundCloud, Яндекс.Диск...) *"
                value={formData.link}
                onChange={handleChange}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Textarea
                name="about"
                placeholder="Расскажи о себе — цели, опыт, достижения"
                value={formData.about}
                onChange={handleChange}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[100px]"
              />

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-neon-violet to-neon-fuchsia hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Icon name="Loader2" size={18} className="animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={18} />
                    Отправить демо
                  </>
                )}
              </button>
              <p className="text-xs text-white/30 text-center">* обязательные поля</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
