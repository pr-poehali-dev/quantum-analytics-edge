import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/ui/icon";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({ name: "", email: "", message: "" });
    }, 3000);
  };

  return (
    <section id="contact" ref={ref} className="py-24 relative overflow-hidden">
      <div
        className={`container mx-auto px-4 relative z-10 transition-all duration-700 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        }`}
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 mb-6 text-xs font-semibold text-white/70 tracking-wide uppercase">
            На связи
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white">
            Обсудить <span className="gradient-text">проект</span>
          </h2>
        </div>
        <div
          className={`max-w-md mx-auto glass-card rounded-3xl p-8 transition-all duration-500 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="text"
              name="name"
              placeholder="Ваше имя"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <Input
              type="email"
              name="email"
              placeholder="Ваш email"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />
            <Textarea
              name="message"
              placeholder="Расскажите о себе и ваших целях"
              value={formData.message}
              onChange={handleChange}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 min-h-[120px]"
            />
            <button
              type="submit"
              disabled={isSubmitting || isSubmitted}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-neon-violet to-neon-fuchsia hover:opacity-90 transition-opacity disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Icon name="Loader2" size={18} className="animate-spin" />
                  Отправка...
                </>
              ) : isSubmitted ? (
                <>
                  <Icon name="CheckCircle" size={18} />
                  Отправлено!
                </>
              ) : (
                <>
                  <Icon name="Send" size={18} />
                  Отправить сообщение
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
