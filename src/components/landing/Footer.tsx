import { Youtube, Instagram, Music2 } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-black py-8 border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-zinc-400 mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} SoundForge. Все права защищены.
          </p>
          <div className="flex space-x-4">
            <a
              href="#"
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="YouTube"
            >
              <Youtube />
            </a>
            <a
              href="#"
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <Instagram />
            </a>
            <a
              href="#"
              className="text-zinc-400 hover:text-white transition-colors"
              aria-label="BeatStars"
            >
              <Music2 />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
