const InteractiveBackground = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#060314]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(139,92,246,0.25),transparent)]" />
      <div
        className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-neon-violet/25 blur-[120px] animate-float-orb"
        style={{ animationDelay: "0s" }}
      />
      <div
        className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-neon-fuchsia/20 blur-[120px] animate-float-orb"
        style={{ animationDelay: "6s" }}
      />
      <div
        className="absolute bottom-0 left-1/4 w-[550px] h-[550px] rounded-full bg-neon-cyan/15 blur-[130px] animate-float-orb"
        style={{ animationDelay: "12s" }}
      />
      <div
        className="absolute inset-0 opacity-[0.03] bg-noise mix-blend-overlay"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
    </div>
  );
};

export default InteractiveBackground;
