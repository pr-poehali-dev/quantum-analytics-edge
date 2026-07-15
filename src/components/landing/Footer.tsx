import Icon from "@/components/ui/icon";

const Footer = () => {
  return (
    <footer className="relative py-10 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <a href="/" className="text-xl font-display font-extrabold gradient-text">
            KS LABEL
          </a>
          <p className="text-white/40 text-sm">
            &copy; {new Date().getFullYear()} Калашников Саунд. Все права защищены.
          </p>
          <div className="flex gap-3">
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-xl glass text-white/60 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_-4px_hsl(var(--neon-fuchsia)/0.7)]"
              aria-label="YouTube"
            >
              <Icon name="Youtube" size={18} />
            </a>
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-xl glass text-white/60 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_-4px_hsl(var(--neon-fuchsia)/0.7)]"
              aria-label="Instagram"
            >
              <Icon name="Instagram" size={18} />
            </a>
            <a
              href="#"
              className="w-10 h-10 flex items-center justify-center rounded-xl glass text-white/60 hover:text-white transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_-4px_hsl(var(--neon-fuchsia)/0.7)]"
              aria-label="BeatStars"
            >
              <Icon name="Music2" size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;