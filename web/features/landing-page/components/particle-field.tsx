"use client";

import { useEffect, useRef } from "react";

const AREA_PER_PARTICLE = 17000; // px² of canvas per particle
const MAX_PARTICLES = 90;
const LINK_DISTANCE = 132;
const POINTER_DISTANCE = 190;

type Particle = { x: number; y: number; vx: number; vy: number; r: number };

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.28,
    vy: (Math.random() - 0.5) * 0.28,
    r: 0.9 + Math.random() * 1.7,
  };
}

/**
 * Decorative drifting-particle constellation behind the landing page.
 * Purely presentational: no pointer events, hidden from assistive tech, and
 * it renders a single static frame when the user prefers reduced motion.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)");

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let animationId = 0;
    const pointer = { x: 0, y: 0, active: false };

    function colors() {
      return darkMode.matches
        ? { dot: "165, 180, 252", link: "129, 140, 248" }
        : { dot: "79, 70, 229", link: "99, 102, 241" };
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const target = Math.min(
        MAX_PARTICLES,
        Math.max(18, Math.round((width * height) / AREA_PER_PARTICLE)),
      );
      // Keep existing particles across resizes so the field doesn't reshuffle.
      particles = particles.slice(0, target).map((particle) => ({
        ...particle,
        x: Math.min(particle.x, width),
        y: Math.min(particle.y, height),
      }));
      while (particles.length < target) {
        particles.push(createParticle(width, height));
      }
    }

    function draw() {
      const { dot, link } = colors();
      ctx!.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];

        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const distance = Math.hypot(dx, dy);
          if (distance > LINK_DISTANCE) continue;
          ctx!.strokeStyle = `rgba(${link}, ${(1 - distance / LINK_DISTANCE) * 0.3})`;
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }

        if (pointer.active) {
          const distance = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (distance < POINTER_DISTANCE) {
            ctx!.strokeStyle = `rgba(${link}, ${(1 - distance / POINTER_DISTANCE) * 0.4})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(pointer.x, pointer.y);
            ctx!.stroke();
          }
        }

        ctx!.fillStyle = `rgba(${dot}, 0.65)`;
        ctx!.beginPath();
        ctx!.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function step() {
      for (const particle of particles) {
        if (pointer.active) {
          // Gentle drift toward the cursor, capped so nothing races off.
          const dx = pointer.x - particle.x;
          const dy = pointer.y - particle.y;
          const distance = Math.hypot(dx, dy);
          if (distance < POINTER_DISTANCE && distance > 1) {
            particle.vx += (dx / distance) * 0.006;
            particle.vy += (dy / distance) * 0.006;
          }
        }

        const speed = Math.hypot(particle.vx, particle.vy);
        if (speed > 0.45) {
          particle.vx = (particle.vx / speed) * 0.45;
          particle.vy = (particle.vy / speed) * 0.45;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around the edges for a continuous field.
        const margin = LINK_DISTANCE / 2;
        if (particle.x < -margin) particle.x = width + margin;
        if (particle.x > width + margin) particle.x = -margin;
        if (particle.y < -margin) particle.y = height + margin;
        if (particle.y > height + margin) particle.y = -margin;
      }

      draw();
      animationId = window.requestAnimationFrame(step);
    }

    function start() {
      window.cancelAnimationFrame(animationId);
      if (reducedMotion.matches) {
        draw();
        return;
      }
      animationId = window.requestAnimationFrame(step);
    }

    function handleResize() {
      resize();
      if (reducedMotion.matches) draw();
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      pointer.active = event.pointerType === "mouse";
    }

    function handlePointerLeave() {
      pointer.active = false;
    }

    resize();
    start();

    window.addEventListener("resize", handleResize);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerleave", handlePointerLeave);
    reducedMotion.addEventListener("change", start);
    darkMode.addEventListener("change", draw);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      reducedMotion.removeEventListener("change", start);
      darkMode.removeEventListener("change", draw);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
      style={{
        maskImage:
          "radial-gradient(120% 90% at 50% 20%, black 0%, black 45%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(120% 90% at 50% 20%, black 0%, black 45%, transparent 100%)",
      }}
    />
  );
}
