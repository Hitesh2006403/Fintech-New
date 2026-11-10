import React, { useEffect, useRef } from 'react';

/**
 * Background3D (High-Performance Optimized)
 * Premium 3D-inspired animated background for Fintech Treasury:
 * - Fluid hardware-accelerated parallax (updates layer transform directly, not container CSS variables)
 * - Automatic idle settle detection (zero DOM updates when mouse is stationary)
 * - Auto-pauses canvas animation during document hidden state or active window scrolling
 * - Lightweight particle pool (restrained count, disabled on mobile/touch screens for 60fps smoothness)
 * - Zero pointer-events interference
 * - Fully accessible (respects prefers-reduced-motion)
 */
export function Background3D() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const layerRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, settled: true });
  const isScrollingRef = useRef(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;

    // Mouse movement listener (desktop only)
    const handleMouseMove = (e) => {
      if (prefersReducedMotion || isMobile) return;
      const { innerWidth, innerHeight } = window;
      mousePos.current.targetX = (e.clientX / innerWidth - 0.5) * 2;
      mousePos.current.targetY = (e.clientY / innerHeight - 0.5) * 2;
      mousePos.current.settled = false;
    };

    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // Scroll throttle to pause canvas during heavy mobile/desktop scrolling
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

    // On mobile devices, skip particles entirely to maximize scrolling FPS and battery life
    const particleCount = (isMobile || prefersReducedMotion) 
      ? 0 
      : Math.min(22, Math.floor((width * height) / 45000));

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: -Math.random() * 0.3 - 0.08,
      alpha: Math.random() * 0.4 + 0.15,
      color: Math.random() > 0.4 ? 'rgba(56, 189, 248, ' : 'rgba(167, 139, 250, '
    }));

    let isRunning = true;

    // Pause rendering when tab is hidden
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

      try {
        // Smooth lerp for mouse parallax
        const dx = mousePos.current.targetX - mousePos.current.x;
        const dy = mousePos.current.targetY - mousePos.current.y;

        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
          mousePos.current.x += dx * 0.05;
          mousePos.current.y += dy * 0.05;
          mousePos.current.settled = false;

          // Apply transform directly to layerRef rather than setting 4 CSS variables on containerRef
          if (layerRef.current && !prefersReducedMotion) {
            const px = mousePos.current.x;
            const py = mousePos.current.y;
            layerRef.current.style.transform = `translate3d(${px * 14}px, ${py * 14}px, 0) rotateY(${px * 5}deg) rotateX(${-py * 5}deg)`;
          }
        } else {
          mousePos.current.settled = true;
        }

        // Draw subtle particles if enabled and not scrolling fast
        if (ctx && particleCount > 0 && !isScrollingRef.current) {
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

            const renderX = p.x + px * 8;
            const renderY = p.y + py * 8;

            ctx.beginPath();
            ctx.arc(renderX, renderY, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `${p.color}${p.alpha})`;
            ctx.fill();
          }
        }

        if (!prefersReducedMotion && (particleCount > 0 || !mousePos.current.settled)) {
          animationFrameId = requestAnimationFrame(render);
        }
      } catch (err) {
        // Silently stop loop if canvas context becomes invalid
        console.warn('Background3D render context warning:', err);
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
      className="fintech-3d-bg"
      aria-hidden="true"
    >
      {/* 1. Deep Atmospheric Gradient Base */}
      <div className="bg-gradient-base" />

      {/* 2. Soft Ambient Blurred Light Orbs */}
      <div className="ambient-light-orb orb-cyan-top" />
      <div className="ambient-light-orb orb-violet-mid" />
      <div className="ambient-light-orb orb-blue-bottom" />
      <div className="ambient-light-orb orb-cyan-center" />

      {/* 3. Floating 3D Glass Objects Layer */}
      <div ref={layerRef} className="floating-3d-layer">
        {/* Sphere 1: Large translucent glass sphere top right */}
        <div className="glass-sphere sphere-lg sphere-pos-1">
          <div className="sphere-specular" />
          <div className="sphere-glow" />
        </div>

        {/* Sphere 2: Mid-size glass sphere left side */}
        <div className="glass-sphere sphere-md sphere-pos-2">
          <div className="sphere-specular" />
        </div>

        {/* Sphere 3: Small glass sphere bottom center */}
        <div className="glass-sphere sphere-sm sphere-pos-3">
          <div className="sphere-specular" />
        </div>

        {/* Sphere 4: Micro accent sphere near top left */}
        <div className="glass-sphere sphere-xs sphere-pos-4">
          <div className="sphere-specular" />
        </div>

        {/* 3D Glass Ring 1: Abstract rotating torus top-right */}
        <div className="glass-ring ring-1">
          <div className="ring-inner" />
        </div>

        {/* 3D Glass Ring 2: Abstract tilted geometric ring lower-left */}
        <div className="glass-ring ring-2">
          <div className="ring-inner" />
        </div>

        {/* 3D Hexagonal Glass Prism element */}
        <div className="glass-prism prism-1" />
      </div>

      {/* 4. Canvas for sparse drifting micro-particles */}
      <canvas ref={canvasRef} className="particles-canvas" />

      {/* 5. Subtle Vignette & Depth Mask */}
      <div className="bg-depth-vignette" />
    </div>
  );
}
