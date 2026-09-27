import { useRef, useEffect, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "Как начать сотрудничество с Калашников Саунд?",
    answer:
      "Отправьте демо через форму на сайте или напишите нам в контактах. Мы прослушаем материал и свяжемся с вами в течение нескольких дней, чтобы обсудить дальнейшие шаги.",
  },
  {
    question: "Какие услуги входят в полный цикл продюсирования?",
    answer:
      "Полный цикл включает разработку концепции, запись и сведение трека, создание визуального стиля, продвижение в соцсетях и на стриминговых площадках, а также организацию съёмок клипа.",
  },
  {
    question: "Сколько стоит продвижение трека?",
    answer:
      "Стоимость зависит от выбранного пакета — от 5 000 ₽ за базовое продвижение до индивидуальных условий для лейбл-партнёрства. Подробности — в разделе «Наши услуги» и «Пакеты продвижения».",
  },
  {
    question: "Как быстро можно получить готовый трек?",
    answer:
      "Средний срок работы над треком — от 2 до 4 недель в зависимости от сложности проекта и загрузки студии. Точные сроки обсуждаются индивидуально на консультации.",
  },
  {
    question: "Можно ли получить бесплатную консультацию?",
    answer:
      "Да, первая консультация по продюсированию — бесплатно. Оставьте заявку через форму «Обсудить проект», и мы разберём ваш кейс.",
  },
];

const FaqSection = () => {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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

  return (
    <section ref={ref} id="faq" className="py-20 relative overflow-hidden">
      <div className="container mx-auto px-4 max-w-3xl">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Остались вопросы?
          </h2>
          <p className="text-zinc-400 text-lg">
            Собрали ответы на то, что чаще всего спрашивают артисты
          </p>
        </div>

        <div
          className={`transition-all duration-700 delay-150 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          }`}
        >
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-white/10 rounded-2xl px-6 bg-black/40 data-[state=open]:border-white/30 transition-colors"
              >
                <AccordionTrigger className="text-white text-left text-base md:text-lg font-semibold hover:no-underline py-5">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-zinc-400 text-sm md:text-base leading-relaxed pb-5">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
