import {
  InteractiveBackground,
  Header,
  HeroSection,
  LicenseSection,
  PromoPackages,
  AboutSection,
  ArtistsSection,
  InterviewsSection,
  NewsSection,
  DemoSection,
  ContactSection,
  Footer,
} from "@/components/landing";

function FloatingNotes() {
  const notes = ["♩","♪","♫","♬","𝄞","♭","♮","♯","𝄢","♩","♪","♫"];
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {notes.map((note, i) => (
        <span
          key={i}
          className="absolute text-white/[0.04] select-none animate-pulse"
          style={{
            fontSize: `${40 + (i % 4) * 20}px`,
            top: `${(i * 8.3) % 100}%`,
            left: `${(i * 8.1 + 5) % 100}%`,
            animationDuration: `${3 + (i % 4)}s`,
            animationDelay: `${i * 0.4}s`,
            transform: `rotate(${-15 + (i % 5) * 8}deg)`,
          }}
        >
          {note}
        </span>
      ))}
    </div>
  );
}

const Index = () => {
  return (
    <div className="min-h-screen text-white relative bg-[#060314]">
      <FloatingNotes />
      <InteractiveBackground />
      <div className="relative z-10">
        <Header />
        <main>
          <HeroSection />
          <LicenseSection />
          <PromoPackages />
          <AboutSection />
          <ArtistsSection />
          <InterviewsSection />
          <NewsSection />
          <DemoSection />
          <ContactSection />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;