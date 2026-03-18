import {
  InteractiveBackground,
  Header,
  HeroSection,
  LicenseSection,
  PromoPackages,
  AboutSection,
  ArtistsSection,
  DemoSection,
  ContactSection,
  Footer,
} from "@/components/landing";

const Index = () => {
  return (
    <div className="min-h-screen text-white relative bg-black">
      <InteractiveBackground />
      <div className="relative z-10">
        <Header />
        <main>
          <HeroSection />
          <LicenseSection />
          <PromoPackages />
          <AboutSection />
          <ArtistsSection />
          <DemoSection />
          <ContactSection />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Index;