import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, CheckCircle } from "lucide-react";
import Icon from "@/components/ui/icon";

const DEMO_URL = "https://functions.poehali.dev/aaaa833c-ba5f-45a3-9e67-57860b52d894";

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
    <section id="demo" ref={ref} className="py-20 relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/10 to-transparent" />

      <div
        className={`container mx-auto px-4 relative z-10 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-6">
            <Icon name="Music" size={16} className="text-white/70" />
            <span className="text-sm text-zinc-400">Отправить демо</span>
          </div>
          <h2 className="text-5xl font-bold mb-4 text-white">Хочешь попасть на лейбл?</h2>
          <p className="text-xl text-zinc-400 max-w-xl mx-auto">
            Отправь своё демо — мы послушаем каждого и свяжемся с теми, чьё творчество нас зацепит
          </p>
        </div>

        <div
          className={`max-w-lg mx-auto bg-zinc-900/60 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/10 transition-all duration-500 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          {isSubmitted ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-white mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Демо отправлено!</h3>
              <p className="text-zinc-400">Мы получили твои материалы и скоро свяжемся с тобой.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  name="name"
                  placeholder="Имя или псевдоним *"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500"
                />
              </div>
              <div>
                <Input
                  type="text"
                  name="contact"
                  placeholder="Telegram или телефон для связи *"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500"
                />
              </div>
              <div>
                <Input
                  type="text"
                  name="genre"
                  placeholder="Жанр / стиль"
                  value={formData.genre}
                  onChange={handleChange}
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500"
                />
              </div>
              <div>
                <Input
                  type="url"
                  name="link"
                  placeholder="Ссылка на демо (YouTube, SoundCloud, Яндекс.Диск...) *"
                  value={formData.link}
                  onChange={handleChange}
                  required
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500"
                />
              </div>
              <div>
                <Textarea
                  name="about"
                  placeholder="Расскажи о себе — цели, опыт, достижения"
                  value={formData.about}
                  onChange={handleChange}
                  className="bg-white/5 border-zinc-700 text-zinc-200 placeholder-zinc-500 min-h-[100px]"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-white text-black hover:bg-zinc-200 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={18} />
                    Отправка...
                  </>
                ) : (
                  <>
                    <Send className="mr-2" size={18} />
                    Отправить демо
                  </>
                )}
              </Button>
              <p className="text-xs text-zinc-500 text-center">* обязательные поля</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default DemoSection;
