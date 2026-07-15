import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const navLinks = [
    { label: "Услуги", href: "/services" },
    { label: "BeatStore", href: "/beatstore" },
    { label: "Новинки", href: "/label-news" },
    { label: "Обо мне", action: () => scrollToSection("about") },
    { label: "Артисты", action: () => scrollToSection("artists") },
    { label: "Интервью", action: () => scrollToSection("interviews") },
    { label: "Новости", href: "/news" },
    { label: "Контакты", action: () => scrollToSection("contact") },
  ];

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-500 ${
        isScrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="container mx-auto px-4">
        <div
          className={`flex justify-between items-center rounded-2xl px-5 transition-all duration-500 ${
            isScrolled ? "glass-card py-2.5" : "py-3"
          }`}
        >
          <a href="/" className="text-2xl font-display font-extrabold tracking-tight gradient-text">
            KS LABEL
          </a>

          <button
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <Icon name={isMenuOpen ? "X" : "Menu"} size={24} />
          </button>

          <nav
            className={`${
              isMenuOpen ? "flex" : "hidden"
            } md:flex absolute md:relative top-[calc(100%+8px)] md:top-auto left-0 w-full md:w-auto flex-col md:flex-row glass-card md:bg-transparent md:backdrop-blur-none md:border-0 md:shadow-none rounded-2xl md:rounded-none p-4 md:p-0`}
          >
            <ul className="flex flex-col md:flex-row gap-1 md:gap-1 md:items-center">
              {navLinks.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    <a
                      href={link.href}
                      className="block px-3 py-2 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <button
                      onClick={link.action}
                      className="block w-full text-left px-3 py-2 text-sm text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-all"
                    >
                      {link.label}
                    </button>
                  )}
                </li>
              ))}
              <li className="md:hidden pt-2 mt-2 border-t border-white/10">
                <a href="/login" className="block px-3 py-2 text-sm text-white/80 hover:text-white">
                  Личный кабинет
                </a>
              </li>
            </ul>
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <a
              href="/login"
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              Кабинет
            </a>
            <a
              href="#contact"
              onClick={(e) => { e.preventDefault(); scrollToSection("contact"); }}
              className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-neon-violet to-neon-fuchsia text-white hover:opacity-90 transition-all glow-violet"
            >
              Связаться
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
