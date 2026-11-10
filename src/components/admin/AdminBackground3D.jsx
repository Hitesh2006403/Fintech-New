import React, { useEffect, useRef } from 'react';

/**
 * AdminBackground3D (High-Performance Optimized)
 * Professional, calm, restrained 3D background designed specifically for the FinSight Admin Portal:
 * - Fluid hardware-accelerated parallax directly updating layer transform
 * - Idle settle detection to halt DOM updates when mouse is stationary
 * - Auto-pauses canvas and animation on document hidden or active scroll
 * - Minimal micro-particles (disabled on mobile for 60fps responsiveness)
 * - Zero pointer-events interference
 * - Fully accessible
 */
export function AdminBackground3D() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const layerRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, settled: true });
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

    const handleMouseMove = (e) => {
      if (prefersReducedMotion || isMobile) return;
      const { innerWidth, innerHeight } = window;
      mousePos.current.targetX = (e.clientX / innerWidth - 0.5) * 1.5;
      mousePos.current.targetY = (e.clientY / innerHeight - 0.5) * 1.5;
      mousePos.current.settled = false;
    };

    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    let scrollTimeout;
    const handleScroll = () => {
      isScrollingRef.current = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (!canvas) return;
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }, 200);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const particleCount = (isMobile || prefersReducedMotion) 
      ? 0 
      : Math.min(10, Math.floor((width * height) / 80000));

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.1 + 0.4,
      speedX: (Math.random() - 0.5) * 0.1,
      speedY: -Math.random() * 0.15 - 0.04,
      alpha: Math.random() * 0.22 + 0.08,
      color: 'rgba(99, 102, 241, '
    }));

    let isRunning = true;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isRunning = false;
      } else {
        isRunning = true;
        if (!prefersReducedMotion && (particleCount > 0 || !mousePos.current.settled)) {
          animationFrameId = requestAnimationFrame(render);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const render = () => {
      if (!isRunning) return;

      const dx = mousePos.current.targetX - mousePos.current.x;
      const dy = mousePos.current.targetY - mousePos.current.y;

      if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
        mousePos.current.x += dx * 0.04;
        mousePos.current.y += dy * 0.04;
        mousePos.current.settled = false;

        if (layerRef.current && !prefersReducedMotion) {
          const px = mousePos.current.x;
          const py = mousePos.current.y;
          layerRef.current.style.transform = `translate3d(${px * 8}px, ${py * 8}px, 0)`;
        }
      } else {
        mousePos.current.settled = true;
      }

      if (particleCount > 0 && !isScrollingRef.current && ctx) {
        try {
          ctx.clearRect(0, 0, width, height);

          const px = mousePos.current.x;
          const py = mousePos.current.y;

          for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.y < -10) {
              p.y = height + 10;
              p.x = Math.random() * width;
            }
            if (p.x < -10) p.x = width + 10;
            if (p.x > width + 10) p.x = -10;

            const renderX = p.x + px * 5;
            const renderY = p.y + py * 5;

            ctx.beginPath();
            ctx.arc(renderX, renderY, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `${p.color}${p.alpha})`;
            ctx.fill();
          }
        } catch (e) {
          // Ignore render exceptions on mobile context drop
        }
      }

      if (!prefersReducedMotion && (particleCount > 0 || !mousePos.current.settled)) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    if (!prefersReducedMotion && (particleCount > 0 || !isMobile)) {
      animationFrameId = requestAnimationFrame(render);
    }

    return () => {
      isRunning = false;
      if (!isMobile) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimeout(scrollTimeout);
      clearTimeout(resizeTimeout);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="admin-3d-bg"
      aria-hidden="true"
    >
      {/* 1. Deep Obsidian-Charcoal Atmospheric Gradient Base */}
      <div className="admin-bg-base" />

      {/* 2. Soft, Calm Ambient Illumination */}
      <div className="admin-ambient-orb admin-orb-top" />
      <div className="admin-ambient-orb admin-orb-bottom" />

      {/* 3. Single Restrained Geometric Obsidian Glass Element */}
      <div ref={layerRef} className="admin-geometry-layer">
        <div className="admin-glass-prism">
          <div className="admin-prism-sheen" />
        </div>
      </div>

      {/* 4. Canvas for sparse particles */}
      <canvas ref={canvasRef} className="admin-particles-canvas" />

      {/* 5. Subtle Vignette */}
      <div className="admin-bg-vignette" />
    </div>
  );
}
