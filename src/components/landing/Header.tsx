import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
    setIsMenuOpen(false);
  };

  return (
    <header
      className={`fixed w-full z-50 transition-all duration-300 ${
        isScrolled ? "bg-black/95 backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <a href="/" className="text-3xl font-bold tracking-tighter text-white">
          Калашников Саунд
        </a>
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white hover:bg-white/10"
          >
            {isMenuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        <nav
          className={`${
            isMenuOpen ? "flex" : "hidden"
          } md:flex absolute md:relative top-full left-0 w-full md:w-auto bg-black/95 md:bg-transparent flex-col md:flex-row`}
        >
          <ul className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-8 p-4 md:p-0">
            <li>
              <button
                onClick={() => scrollToSection("licenses")}
                className="text-white hover:text-purple-400 transition-colors"
              >
                Услуги
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("about")}
                className="text-white hover:text-purple-400 transition-colors"
              >
                Обо мне
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("artists")}
                className="text-white hover:text-purple-400 transition-colors"
              >
                Артисты
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("demo")}
                className="text-white hover:text-purple-400 transition-colors"
              >
                Отправить демо
              </button>
            </li>
            <li>
              <button
                onClick={() => scrollToSection("contact")}
                className="text-white hover:text-purple-400 transition-colors"
              >
                Контакты
              </button>
            </li>
          </ul>
        </nav>
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            className="border-white/20 text-white hover:bg-white/10"
            asChild
          >
            <a href="/login">Кабинет</a>
          </Button>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            asChild
          >
            <a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }}>
              Связаться
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;