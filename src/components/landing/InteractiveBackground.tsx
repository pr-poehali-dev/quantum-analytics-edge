import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update: (mouseX: number, mouseY: number, canvasWidth: number, canvasHeight: number) => void;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

const InteractiveBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let mouseX = 0;
    let mouseY = 0;

    const particles: Particle[] = [];
    const particleCount = 100;

    const createParticle = (): Particle => {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 5 + 1;
      let speedX = Math.random() * 3 - 1.5;
      let speedY = Math.random() * 3 - 1.5;
      const color = `rgba(${Math.floor(Math.random() * 100 + 155)}, ${Math.floor(Math.random() * 100 + 155)}, 255, 0.7)`;

      return {
        x,
        y,
        size,
        speedX,
        speedY,
        color,
        update(mX: number, mY: number, canvasWidth: number, canvasHeight: number) {
          this.x += this.speedX + (mX - canvasWidth / 2) * 0.01;
          this.y += this.speedY + (mY - canvasHeight / 2) * 0.01;

          if (this.x < 0 || this.x > canvasWidth) this.speedX *= -1;
          if (this.y < 0 || this.y > canvasHeight) this.speedY *= -1;
        },
        draw(context: CanvasRenderingContext2D) {
          context.fillStyle = this.color;
          context.beginPath();
          context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
          context.fill();
        },
      };
    };

    const init = () => {
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const particle of particles) {
        particle.update(mouseX, mouseY, canvas.width, canvas.height);
        particle.draw(ctx);
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
    };

    handleResize();
    init();
    animate();

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full -z-10" />;
};

export default InteractiveBackground;
