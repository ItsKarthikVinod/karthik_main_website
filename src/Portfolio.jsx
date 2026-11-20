import React, { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import './Portfolio.css';


export default function Portfolio() {
  const bgCanvasRef = useRef(null);
  const [selectedCert, setSelectedCert] = useState(null);
  const PROJECT_COUNT = 12;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedCert(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (selectedCert) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedCert]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const isMobile = window.innerWidth < 768;
    const SOURCE_TOTAL_FRAMES = 238;
    const TOTAL_FRAMES = isMobile ? 60 : SOURCE_TOTAL_FRAMES;
    const bgCanvas = bgCanvasRef.current;
    if (!bgCanvas) return;

    const bgCtx = bgCanvas.getContext('2d', { alpha: false });

    const bgImages = new Array(TOTAL_FRAMES + 1);

    let renderedFrame = -1;
    let targetProgress = 0;
    let currentProgress = 0;
    let animId = null;
    let preloadTimeout = null;
    let isMounted = true;
    let lastFrameTime = null;

    const getBgPath = (index) => {
      const sourceIndex = isMobile
        ? Math.round(1 + ((index - 1) * (SOURCE_TOTAL_FRAMES - 1)) / (TOTAL_FRAMES - 1))
        : index;
      const num = String(sourceIndex).padStart(3, '0');
      return `/ezgif-jpg/ezgif-frame-${num}.webp`;
    };

    const resizeCanvases = () => {
      if (!isMounted || !bgCanvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);

      bgCanvas.width = w;
      bgCanvas.height = h;
      bgCtx.imageSmoothingEnabled = true;
      bgCtx.imageSmoothingQuality = isMobile ? 'medium' : 'high';

      if (renderedFrame > 0) {
        drawFrame(renderedFrame);
      }
    };

    const getBestBgImage = (target) => {
      if (bgImages[target] && bgImages[target].complete && bgImages[target].naturalWidth > 0) {
        return bgImages[target];
      }
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = target - offset;
        if (prev >= 1 && bgImages[prev] && bgImages[prev].complete && bgImages[prev].naturalWidth > 0) {
          return bgImages[prev];
        }
        const next = target + offset;
        if (next <= TOTAL_FRAMES && bgImages[next] && bgImages[next].complete && bgImages[next].naturalWidth > 0) {
          return bgImages[next];
        }
      }
      return null;
    };

    const drawFrame = (framePosition) => {
      if (!isMounted) return;
      const cw = bgCanvas.width;
      const ch = bgCanvas.height;
      const lowerIndex = Math.floor(framePosition);
      const upperIndex = Math.min(TOTAL_FRAMES, lowerIndex + 1);
      const blend = framePosition - lowerIndex;
      const bgImg = getBestBgImage(lowerIndex);
      const upperImg = bgImages[upperIndex]?.complete && bgImages[upperIndex].naturalWidth > 0
        ? bgImages[upperIndex]
        : null;

      const drawImage = (image, alpha = 1) => {
        const iw = image.naturalWidth;
        const ih = image.naturalHeight;
        const scale = Math.max(cw / iw, ch / ih);
        const dw = Math.ceil(iw * scale);
        const dh = Math.ceil(ih * scale);
        const dx = Math.floor((cw - dw) * 0.5);
        const dy = Math.floor((ch - dh) * 0.5);

        bgCtx.globalAlpha = alpha;
        bgCtx.drawImage(image, dx, dy, dw, dh);
      };

      if (bgImg) drawImage(bgImg);
      if (isMobile && blend > 0 && upperImg && upperImg !== bgImg) {
        drawImage(upperImg, blend);
      }
      bgCtx.globalAlpha = 1;
      renderedFrame = framePosition;
    };

    const preloadFrames = () => {
      const batchSize = 10;
      const batchDelay = 100;

      const loadBatch = (start) => {
        if (!isMounted) return;

        const end = Math.min(start + batchSize - 1, TOTAL_FRAMES);
        for (let i = start; i <= end; i++) {
          const bg = new Image();
          bgImages[i] = bg;
          bg.onload = () => {
            if (isMounted && renderedFrame > 0) {
              drawFrame(renderedFrame);
            }
          };
          bg.src = getBgPath(i);
        }

        if (end < TOTAL_FRAMES) {
          preloadTimeout = window.setTimeout(() => loadBatch(end + 1), batchDelay);
        }
      };

      loadBatch(1);
    };

    const calculateNativeScrollProgress = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll <= 0) return 0;
      return Math.min(1, Math.max(0, window.scrollY / maxScroll));
    };

    let lenis = null;
    if (!isMobile) {
      try {
        lenis = new Lenis({
          duration: 1.2,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          touchMultiplier: 1.5,
        });

        lenis.on('scroll', (e) => {
          targetProgress = Math.min(1, Math.max(0, e.progress));
        });
      } catch (e) {
        console.warn('Lenis initialization fallback to native scroll', e);
      }
    }

    targetProgress = calculateNativeScrollProgress();
    const handleScroll = () => {
      if (!lenis) {
        targetProgress = calculateNativeScrollProgress();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', resizeCanvases);

    // 60 FPS animation loop with dual-canvas synchronized scrubbing
    const tick = (time) => {
      if (!isMounted) return;
      if (lenis) {
        lenis.raf(time);
      }

      const deltaTime = lastFrameTime === null
        ? 1000 / 60
        : Math.min(50, Math.max(0, time - lastFrameTime));
      lastFrameTime = time;
      const smoothingDuration = lenis ? 66 : isMobile ? 70 : 130;
      const lerpFactor = 1 - Math.exp(-deltaTime / smoothingDuration);
      currentProgress += (targetProgress - currentProgress) * lerpFactor;

      const framePosition = 1 + currentProgress * (TOTAL_FRAMES - 1);
      const clampedFrame = isMobile
        ? Math.min(TOTAL_FRAMES, Math.max(1, framePosition))
        : Math.round(Math.min(TOTAL_FRAMES, Math.max(1, framePosition)));

      if (Math.abs(clampedFrame - renderedFrame) > 0.01) {
        drawFrame(clampedFrame);
      }

      animId = requestAnimationFrame(tick);
    };

    resizeCanvases();
    preloadFrames();
    animId = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      if (animId) cancelAnimationFrame(animId);
      if (preloadTimeout) window.clearTimeout(preloadTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', resizeCanvases);
      if (lenis) lenis.destroy();
    };
  }, []);

  return (
    <div className="portfolio-root">
      {/* LAYER 1: FIXED BACKGROUND CANVAS (ezgif-jpg scroll frames) */}
      <div id="canvas-container">
        <canvas ref={bgCanvasRef} id="canvas"></canvas>
      </div>

      {/* LAYER 4: INTERACTIVE FOREGROUND PAGE CONTENT (z-index: 4) */}
      <main className="page-wrapper">
        {/* HERO SECTION */}
        <section className="hero-container">
          {/* TOP NAVIGATION */}
          <nav className="nav-bar">
            <a href="#" className="brand-logo">
              <span className="brand-dot"></span>
              <span>Karthik Vinod</span>
            </a>
            <ul className="nav-links">
              <li><a href="#about" className="nav-link">About</a></li>
              <li><a href="#projects" className="nav-link">Projects</a></li>
              <li><a href="#certificates" className="nav-link">Certificates</a></li>
              <li><a href="#contact" className="nav-link">Contact</a></li>
            </ul>
            <a href="#contact" className="btn-nav-touch">
              <span>Get In Touch</span>
              <span className="btn-circle-arrow">→</span>
            </a>
          </nav>

          {/* HERO CENTER CONTENT & STATS */}
          <div className="hero-center-content">
            {/* Left: Full-stack Developer Bio */}
            <div className="hero-left-col">
              <span className="hero-greeting">Hello, I'm</span>
              <h1 className="hero-name">
                KARTHIK<br />VINOD
              </h1>
              <p className="hero-role-tag">Full-Stack Developer & Software Engineer</p>
              <p className="hero-bio">
                I engineer end-to-end scalable web applications, robust backend microservices, and high-performance interactive interfaces.
              </p>
              <div className="hero-badge-pill">
                <span className="pulse-dot"></span>
                <span>Available for Work & Collaboration</span>
              </div>
            </div>

            {/* Right: Statement & Full-stack Stats */}
            <div className="hero-right-col">
              <div className="hero-quote-box">
                <span className="sparkle-icon">✦</span>
                <p>Engineering scalable architectures and memorable digital experiences.</p>
              </div>

              <div className="hero-stats-stack">

                <div className="stat-item">
                  <span className="stat-num">{PROJECT_COUNT}+</span>
                  <span className="stat-label">Projects Under My Belt</span>
                </div>

              </div>
            </div>
          </div>


          {/* SCROLL INDICATOR */}
          <div className="scroll-indicator">
            <div className="scroll-mouse">
              <div className="scroll-wheel" />
            </div>
            <span className="scroll-label">Scroll</span>
          </div>

        </section>
        {/* TECH ECOSYSTEM / PARTNERS BAR */}
        <section className="trusted-bar" id="about">
          <div className="trusted-label">
            Core Technologies &<br />Modern Ecosystem
          </div>
          <div className="brands-container">
            {/* React & Next.js */}
            <div className="brand-logo-item">
              <svg className="brand-icon-svg" viewBox="0 0 24 24">
                <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(30 12 12)" />
                <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(90 12 12)" />
                <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(150 12 12)" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              </svg>
              <span>React / Next.js</span>
            </div>
            {/* Node.js & TypeScript */}
            <div className="brand-logo-item">
              <svg className="brand-icon-svg" viewBox="0 0 24 24">
                <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" />
              </svg>
              <span>Node.js </span>
            </div>
            {/* Python & Django */}
            <div className="brand-logo-item">
              <svg className="brand-icon-svg" viewBox="0 0 24 24">
                <path d="M 12 3 A 9 9 0 0 0 12 21 Z" fill="currentColor" />
                <circle cx="12" cy="9" r="9" />
              </svg>
              <span>Python / APIs</span>
            </div>
            {/* PostgreSQL & MongoDB */}
            <div className="brand-logo-item">
              <svg className="brand-icon-svg" viewBox="0 0 24 24">
                <ellipse cx="12" cy="6" rx="8" ry="3" />
                <path d="M 4 6 V 18 C 4 19.6 7.6 21 12 21 C 16.4 21 20 19.6 20 18 V 6" />
                <path d="M 4 12 C 4 13.6 7.6 15 12 15 C 16.4 15 20 13.6 20 12" />
              </svg>
              <span>SQL & NoSQL</span>
            </div>
            {/*Git and Github*/}
            <div className="brand-logo-item">
              <svg className="brand-icon-svg" viewBox="0 0 24 24">
                <path d="M 12 2 C 17.5 2 22 6.5 22 12 C 22 17.5 17.5 22 12 22 C 6.5 22 2 17.5 2 12 C 2 6.5 6.5 2 12 2 Z" />
                <path d="M 12 8 C 9.786 8 8 9.786 8 12 C 8 14.214 9.786 16 12 16 C 14.214 16 16 14.214 16 12 C 16 9.786 14.214 8 12 8 Z" />
                <path d="M 12 14.5 C 12 14.5 10.5 16 12 16 C 13.5 16 12 14.5 12 14.5 Z" />
              </svg>
              <span>Git & Github</span>
            </div>
            {/*Firebase and Cloud*/}
            <div className="brand-logo-item">
              <svg className="brand-icon-svg" viewBox="0 0 24 24">
                <path d="M 12 2 C 17.5 2 22 6.5 22 12 C 22 17.5 17.5 22 12 22 C 6.5 22 2 17.5 2 12 C 2 6.5 6.5 2 12 2 Z" />
                <path d="M 12 8 C 9.786 8 8 9.786 8 12 C 8 14.214 9.786 16 12 16 C 14.214 16 16 14.214 16 12 C 16 9.786 14.214 8 12 8 Z" />
                <path d="M 12 14.5 C 12 14.5 10.5 16 12 16 C 13.5 16 12 14.5 12 14.5 Z" />
              </svg>
              <span>Firebase & Cloud</span>
            </div>
          </div>


        </section>

        {/* ───────────────────────────────────────────────
            SELECTED WORK SECTION
            No section wrapper — floats directly on canvas
        ─────────────────────────────────────────────── */}
        <section className="selected-work-section" id="projects">
          {/* Header row */}
          <div className="sw-header">
            <div className="sw-title-group">
              <span className="cert-tag">Featured Works</span>
              <h2 className="sw-title">Projects I've Built</h2>
              <div className="sw-title-line" />
            </div>
            {/* <a href="#contact" className="sw-view-all">
              View All Projects <span className="sw-arrow">→</span>
            </a> */}
          </div>

          {/* Project cards grid */}
          <div className="sw-grid">

            {/* Card 1 — LifeMastery */}
            <a href="https://lifemastery.karthikvinod.com" target='_blank' className="sw-card">
              <div className="sw-card-mockup sw-mockup-desktop">
                <img src="https://portfolio.karthikvinod.com/images/project-11.png" />
              </div>
              <div className="sw-card-body">
                <div className="sw-card-title-row">
                  <h3 className="sw-card-name">LifeMastery - Unlock Your True Potential</h3>
                  <span className="sw-external-icon">↗</span>
                </div>
                <p className="sw-card-desc">LifeMastery is the all-in-one AI-powered productivity and personal growth app that helps you conquer goals, build unstoppable habits, reflect with intention, focus deeper, and turn everyday progress into a life you’re genuinely proud of.</p>
                <div className="sw-card-tags">
                  <span>React.js</span>●<span>Tailwind CSS</span>●<span>Firebase</span>●<span>PWA</span>●<span>Web API</span>
                </div>
              </div>
            </a>
            {/* Card 2 — Glint AI*/}
            <a href="https://glintai.karthikvinod.com" target='_blank' className="sw-card">
              <div className="sw-card-mockup sw-mockup-desktop">
                <img src="/glintai.karthikvinod.com_.png" />
              </div>
              <div className="sw-card-body">
                <div className="sw-card-title-row">
                  <h3 className="sw-card-name">Glint AI Headshots</h3>
                  <span className="sw-external-icon">↗</span>
                </div>
                <p className="sw-card-desc">Glint AI Headshots is your AI-powered shortcut to a confident first impression—transform any selfie into a polished, professional headshot with styles that feel like you.</p>
                <div className="sw-card-tags">
                  <span>React.js</span>●<span>TypeScript</span>●<span>Cloudinary</span>●<span>TailwindCSS</span>
                </div>
              </div>
            </a>

            {/* Card 3 — Portfolio */}
            <a href="https://portfolio.karthikvinod.com" target='_blank' className="sw-card">
              <div className="sw-card-mockup sw-mockup-desktop">
                <img src="/portfolio.karthikvinod.com_.png" />
              </div>
              <div className="sw-card-body">
                <div className="sw-card-title-row">
                  <h3 className="sw-card-name">Karthik's Portfolio</h3>
                  <span className="sw-external-icon">↗</span>
                </div>
                <p className="sw-card-desc">A portfolio that changes with your screen—macOS-inspired on desktop, iOS-inspired on mobile, and packed with my work wherever you go.</p>
                <div className="sw-card-tags">
                  <span>React.js</span>●<span>Tailwind CSS</span>●<span>GSAP</span>●<span>Zustand</span>
                </div>
              </div>
            </a>



          </div>
        </section>




        {/* CERTIFICATES SECTION */}
        <section className="cert-section" id="certificates">
          {/* Main Header */}
          <div className="cert-header-bar">
            <div className="cert-heading-group">
              <span className="cert-tag">LICENSES & ACCREDITATIONS</span>
              <h2 className="cert-title">Certifications & Accreditations</h2>
            </div>
            {/* <a href="#contact" className="sw-view-all">
              View All Certifications <span className="sw-arrow">→</span>
            </a> */}

          </div>

          {/* Part 1: 6 Flagship Technical Certifications */}
          <div className="cert-grid">
            {/* Certificate 1: Harvard University (CS50) */}
            <div
              className="cert-card"
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedCert({
                  id: "harvard-cs50ai",
                  title: "CS50's Introduction to Artificial Intelligence with Python",
                  image: "/certificates/CS50AI.webp",
                  issuer: "Harvard University (CS50)",
                  level: "Verified Course Certificate",
                  year: "2026",
                  issueDate: "2026",
                  description:
                    "Completed Harvard's intensive AI curriculum including 12 hands-on programming projects covering graph search algorithms, adversarial search, knowledge representation, probabilistic inference, machine learning, and neural networks.",
                  skills: ["Python", "Machine Learning", "Neural Networks", "Search Algorithms", "Probabilistic Models"],
                  accentColor: "#A51C30",
                  issuerLogo: (
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Harvard_University_coat_of_arms.svg"
                      alt="Harvard University"
                      className="cert-modal-logo-svg"
                      style={{ objectFit: "contain" }}
                    />
                  ),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <div className="cert-card-inner">
                <div className="cert-card-top">
                  <div className="cert-icon-wrapper cert-icon-harvard" title="Harvard University">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/c/cc/Harvard_University_coat_of_arms.svg"
                      alt="Harvard University"
                      className="cert-issuer-svg"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <span className="cert-year-tag">2026</span>
                </div>
                <h3 className="cert-name">CS50's Introduction to AI with Python</h3>
                <p className="cert-issuer">Harvard University (CS50) • 12 AI Projects</p>
                <p className="cert-desc">
                  Completed Harvard's intensive AI curriculum including 12 hands-on programming projects covering graph search algorithms, adversarial search, probabilistic inference, machine learning, and neural networks.
                </p>
                <div className="cert-skills-list">
                  <span className="cert-pill">Python</span>
                  <span className="cert-pill">Machine Learning</span>
                  <span className="cert-pill">Neural Networks</span>
                  <span className="cert-pill">Algorithms</span>
                </div>
              </div>
              <div className="cert-card-bottom">
                <span className="cert-view-action">
                  <span>View Certificate</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
              </div>
            </div>

            {/* Certificate 2: Microsoft & freeCodeCamp */}
            <div
              className="cert-card"
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedCert({
                  id: "microsoft-csharp",
                  title: "Foundational C# with Microsoft",
                  image: "/certificates/Foundational.webp",
                  issuer: "Microsoft & freeCodeCamp",
                  level: "Developer Certification",
                  year: "2026",
                  issueDate: "June 5, 2026",
                  description:
                    "Earned Microsoft's verified developer certification demonstrating mastery of C# syntax, object-oriented programming, data types, control flow, debugging, and console application architecture.",
                  skills: ["C#", ".NET", "Object-Oriented Programming", "Debugging", "Software Logic"],
                  accentColor: "#00A4EF",
                  issuerLogo: (
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                      alt="Microsoft"
                      className="cert-modal-logo-svg"
                      style={{ objectFit: "contain" }}
                    />
                  ),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <div className="cert-card-inner">
                <div className="cert-card-top">
                  <div className="cert-icon-wrapper cert-icon-microsoft" title="Microsoft">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg"
                      alt="Microsoft"
                      className="cert-issuer-svg"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <span className="cert-year-tag">2026</span>
                </div>
                <h3 className="cert-name">Foundational C# with Microsoft</h3>
                <p className="cert-issuer">Microsoft & freeCodeCamp • Developer Certification</p>
                <p className="cert-desc">
                  Earned Microsoft's verified developer certification demonstrating mastery of C# syntax, object-oriented programming, data types, control flow, debugging, and console application architecture.
                </p>
                <div className="cert-skills-list">
                  <span className="cert-pill">C#</span>
                  <span className="cert-pill">.NET</span>
                  <span className="cert-pill">OOP</span>
                  <span className="cert-pill">Software Logic</span>
                </div>
              </div>
              <div className="cert-card-bottom">
                <span className="cert-view-action">
                  <span>View Certificate</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
              </div>
            </div>

            {/* Certificate 3: Google AI Fundamentals */}
            <div
              className="cert-card"
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedCert({
                  id: "google-ai-fundamentals",
                  title: "AI Fundamentals",
                  image: "/certificates/AIFundamentals.webp",
                  issuer: "Google Career Certificates (Coursera)",
                  level: "Verified Course Certificate",
                  year: "2026",
                  issueDate: "September 8, 2026",
                  description:
                    "Completed Google's foundational AI certification covering core artificial intelligence concepts, practical machine learning applications, and ethical AI integration.",
                  skills: ["Artificial Intelligence", "Machine Learning", "Google", "AI Concepts"],
                  accentColor: "#4285F4",
                  issuerLogo: (
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                      alt="Google"
                      className="cert-modal-logo-svg"
                      style={{ objectFit: "contain" }}
                    />
                  ),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <div className="cert-card-inner">
                <div className="cert-card-top">
                  <div className="cert-icon-wrapper cert-icon-google" title="Google Career Certificates">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
                      alt="Google"
                      className="cert-issuer-svg"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <span className="cert-year-tag">2026</span>
                </div>
                <h3 className="cert-name">AI Fundamentals</h3>
                <p className="cert-issuer">Google Career Certificates • Coursera Verified</p>
                <p className="cert-desc">
                  Completed Google's foundational AI certification covering core artificial intelligence concepts, practical machine learning applications, and ethical AI integration.
                </p>
                <div className="cert-skills-list">
                  <span className="cert-pill">Artificial Intelligence</span>
                  <span className="cert-pill">Machine Learning</span>
                  <span className="cert-pill">Google</span>
                </div>
              </div>
              <div className="cert-card-bottom">
                <span className="cert-view-action">
                  <span>View Certificate</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
              </div>
            </div>

            {/* Certificate 4: Anthropic */}
            <div
              className="cert-card"
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedCert({
                  id: "anthropic-claude",
                  title: "Claude Code in Action",
                  image: "/certificates/claude.webp",
                  issuer: "Anthropic",
                  level: "Certificate of Completion",
                  year: "2026",
                  issueDate: "March 10, 2026",
                  description:
                    "Mastered agentic software engineering workflows with Anthropic's Claude Code, focusing on codebase navigation, automated refactoring, tool-use integration, and AI-assisted development.",
                  skills: ["Claude Code", "Agentic Workflows", "LLMs", "Prompt Engineering", "AI Tooling"],
                  accentColor: "#D97757",
                  issuerLogo: (
                    <img
                      src="https://cdn.simpleicons.org/anthropic/D97757"
                      alt="Anthropic"
                      className="cert-modal-logo-svg"
                      style={{ objectFit: "contain" }}
                    />
                  ),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <div className="cert-card-inner">
                <div className="cert-card-top">
                  <div className="cert-icon-wrapper cert-icon-anthropic" title="Anthropic">
                    <img
                      src="https://cdn.simpleicons.org/anthropic/D97757"
                      alt="Anthropic"
                      className="cert-issuer-svg"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <span className="cert-year-tag">2026</span>
                </div>
                <h3 className="cert-name">Claude Code in Action</h3>
                <p className="cert-issuer">Anthropic • Agentic Development</p>
                <p className="cert-desc">
                  Mastered agentic software engineering workflows with Anthropic's Claude Code, focusing on codebase navigation, automated refactoring, tool-use integration, and AI-assisted development.
                </p>
                <div className="cert-skills-list">
                  <span className="cert-pill">Claude Code</span>
                  <span className="cert-pill">Agentic Workflows</span>
                  <span className="cert-pill">LLMs</span>
                  <span className="cert-pill">Prompt Engineering</span>
                </div>
              </div>
              <div className="cert-card-bottom">
                <span className="cert-view-action">
                  <span>View Certificate</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
              </div>
            </div>

            {/* Certificate 5: HackerRank */}
            <div
              className="cert-card"
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedCert({
                  id: "hackerrank-react",
                  title: "Frontend Developer (React) Role Certification",
                  image: "/certificates/REACT.webp",
                  issuer: "HackerRank",
                  level: "Role Certification",
                  year: "2026",
                  issueDate: "March 17, 2026",
                  description:
                    "Passed HackerRank's timed role-based technical assessment validating production-ready proficiency in React component architecture, state management, JavaScript (ES6+), and responsive CSS.",
                  skills: ["React.js", "JavaScript", "CSS3", "Frontend Architecture", "State Management"],
                  accentColor: "#00EA64",
                  issuerLogo: (
                    <img
                      src="https://cdn.simpleicons.org/hackerrank/00EA64"
                      alt="HackerRank"
                      className="cert-modal-logo-svg"
                      style={{ objectFit: "contain" }}
                    />
                  ),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <div className="cert-card-inner">
                <div className="cert-card-top">
                  <div className="cert-icon-wrapper cert-icon-hackerrank" title="HackerRank">
                    <img
                      src="https://cdn.simpleicons.org/hackerrank/00EA64"
                      alt="HackerRank"
                      className="cert-issuer-svg"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <span className="cert-year-tag">2026</span>
                </div>
                <h3 className="cert-name">Frontend Developer (React)</h3>
                <p className="cert-issuer">HackerRank • Role Certification</p>
                <p className="cert-desc">
                  Passed HackerRank's timed role-based technical assessment validating production-ready proficiency in React component architecture, state management, JavaScript (ES6+), and responsive CSS.
                </p>
                <div className="cert-skills-list">
                  <span className="cert-pill">React.js</span>
                  <span className="cert-pill">JavaScript</span>
                  <span className="cert-pill">CSS3</span>
                  <span className="cert-pill">Frontend Architecture</span>
                </div>
              </div>
              <div className="cert-card-bottom">
                <span className="cert-view-action">
                  <span>View Certificate</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
              </div>
            </div>

            {/* Certificate 6: IITM Pravartak (IIT Madras) & GUVI */}
            <div
              className="cert-card"
              role="button"
              tabIndex={0}
              onClick={() =>
                setSelectedCert({
                  id: "iitm-python",
                  title: "Python Programming Certification",
                  image: "/certificates/GUVI.webp",
                  issuer: "IITM Pravartak (IIT Madras) & GUVI",
                  level: "Technology Innovation Hub Accredited",
                  year: "2023",
                  issueDate: "July 2023",
                  description:
                    "Completed an accredited multi-language Python programming track backed by the Technology Innovation Hub of IIT Madras, building strong algorithmic and problem-solving foundations.",
                  skills: ["Python", "Algorithms", "Data Structures", "Problem Solving"],
                  accentColor: "#F59E0B",
                  issuerLogo: (
                    <img
                      src="https://upload.wikimedia.org/wikipedia/en/6/69/IIT_Madras_Logo.svg"
                      alt="IIT Madras"
                      className="cert-modal-logo-svg"
                      style={{ objectFit: "contain" }}
                    />
                  ),
                })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <div className="cert-card-inner">
                <div className="cert-card-top">
                  <div className="cert-icon-wrapper cert-icon-iitm" title="IITM Pravartak (IIT Madras)">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/en/6/69/IIT_Madras_Logo.svg"
                      alt="IIT Madras"
                      className="cert-issuer-svg"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <span className="cert-year-tag">2023</span>
                </div>
                <h3 className="cert-name">Python Programming Certification</h3>
                <p className="cert-issuer">IITM Pravartak (IIT Madras) & GUVI</p>
                <p className="cert-desc">
                  Completed an accredited multi-language Python programming track backed by the Technology Innovation Hub of IIT Madras, building strong algorithmic and problem-solving foundations.
                </p>
                <div className="cert-skills-list">
                  <span className="cert-pill">Python</span>
                  <span className="cert-pill">Algorithms</span>
                  <span className="cert-pill">Data Structures</span>
                  <span className="cert-pill">Problem Solving</span>
                </div>
              </div>
              <div className="cert-card-bottom">
                <span className="cert-view-action">
                  <span>View Certificate</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </span>
              </div>
            </div>
          </div>

          {/* Part 2: UAE Government & Regional Honors Sub-Strip */}
          <div className="gov-honors-wrapper">
            <div className="gov-honors-header">
              <span className="gov-honors-dot" />
              <h3 className="gov-honors-heading">UAE Government & Regional Honors</h3>
            </div>

            <div className="gov-honors-grid">
              {/* Honor 1: Dubai Future Foundation */}
              <div
                className="gov-honor-card"
                role="button"
                tabIndex={0}
                onClick={() =>
                  setSelectedCert({
                    id: "dff-1m-prompters",
                    title: "1 Million Prompters — AI Prompt Engineering",
                    image: "/certificates/MILLION.webp",
                    issuer: "Dubai Future Foundation & Dubai Centre for AI",
                    level: "Government of Dubai Initiative",
                    year: "2026",
                    issueDate: "2026",
                    description:
                      "Completed the One Million Prompters initiative launched by H.H. Sheikh Hamdan bin Mohammed bin Rashid Al Maktoum, Crown Prince of Dubai, focusing on applied prompt engineering and generative AI systems aligned with the Dubai Universal Blueprint for Artificial Intelligence.",
                    skills: ["Prompt Engineering", "Generative AI", "AI Systems", "Dubai AI Blueprint"],
                    accentColor: "#0066CC",
                    issuerLogo: (
                      <svg viewBox="0 0 36 36" className="cert-modal-logo-svg" fill="none">
                        <ellipse cx="18" cy="18" rx="13" ry="8.5" stroke="#0066CC" strokeWidth="2.4" />
                        <circle cx="21" cy="18" r="4" fill="#0066CC" />
                      </svg>
                    ),
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
              >
                <div className="gov-honor-icon" style={{ borderColor: "rgba(0, 102, 204, 0.35)" }}>
                  <svg viewBox="0 0 36 36" width="24" height="24" fill="none">
                    <ellipse cx="18" cy="18" rx="13" ry="8.5" stroke="#38BDF8" strokeWidth="2.4" />
                    <circle cx="21" cy="18" r="4" fill="#38BDF8" />
                  </svg>
                </div>
                <div className="gov-honor-content">
                  <div className="gov-honor-top">
                    <span className="gov-honor-issuer">Dubai Future Foundation • Gov. of Dubai</span>
                    <span className="cert-year-tag">2026</span>
                  </div>
                  <h4 className="gov-honor-title">1 Million Prompters AI Certificate</h4>
                  <p className="gov-honor-sub">
                    Crown Prince of Dubai Initiative • Prompt Engineering & Generative AI
                  </p>
                </div>
              </div>

              {/* Honor 2: Sharjah Sustainability Award (EPAA) */}
              <div
                className="gov-honor-card"
                role="button"
                tabIndex={0}
                onClick={() =>
                  setSelectedCert({
                    id: "sharjah-sustainability",
                    title: "Sharjah Sustainability Award — Best Outstanding Team",
                    image: "/certificates/SSA.webp",
                    issuer: "Environment & Protected Areas Authority (EPAA), Sharjah",
                    level: "10th Cycle Government Award",
                    year: "2022",
                    issueDate: "2022",
                    description:
                      "Awarded Certificate of Appreciation and Best Outstanding Team recognition by the Government of Sharjah's Environment & Protected Areas Authority for developing an innovative sustainable environmental project.",
                    skills: ["Sustainability Tech", "Environmental Innovation", "Team Leadership", "Project Design"],
                    accentColor: "#10B981",
                    issuerLogo: (
                      <svg viewBox="0 0 36 36" className="cert-modal-logo-svg" fill="none">
                        <circle cx="18" cy="18" r="13" stroke="#10B981" strokeWidth="1.8" fill="#10B981" fillOpacity="0.12" />
                        <path d="M18 26V13M18 15c-3-2.5-6.5-2-8 0M18 15c3-2.5 6.5-2 8 0M18 12c-2-3-5-3.5-6.5-2M18 12c2-3 5-3.5 6.5-2" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    ),
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.currentTarget.click();
                  }
                }}
              >
                <div className="gov-honor-icon" style={{ borderColor: "rgba(16, 185, 129, 0.35)" }}>
                  <svg viewBox="0 0 36 36" width="24" height="24" fill="none">
                    <circle cx="18" cy="18" r="13" stroke="#10B981" strokeWidth="1.8" fill="#10B981" fillOpacity="0.12" />
                    <path d="M18 26V13M18 15c-3-2.5-6.5-2-8 0M18 15c3-2.5 6.5-2 8 0M18 12c-2-3-5-3.5-6.5-2M18 12c2-3 5-3.5 6.5-2" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="gov-honor-content">
                  <div className="gov-honor-top">
                    <span className="gov-honor-issuer">Sharjah EPAA • Government of Sharjah</span>
                    <span className="cert-year-tag">2022</span>
                  </div>
                  <h4 className="gov-honor-title">Sharjah Sustainability Award (10th Cycle)</h4>
                  <p className="gov-honor-sub">
                    Best Outstanding Team Award • Sustainable Environmental Project
                  </p>
                </div>
              </div>


            </div>
          </div>
        </section>



        {/* FOOTER SECTION */}
        <footer className="footer-section" id="contact">
          <div className="footer-main-grid">
            {/* Left: Call to Action */}
            <div>
              <h2 className="footer-cta-title">
                Let's Build Something<br />Extraordinary Together.
              </h2>
              <p className="footer-cta-sub">
                I am currently open for full-time full-stack engineering roles, high-impact consulting, and architecture collaboration. Let's create scalable software that delivers measurable results.
              </p>
              <div className="footer-cta-actions">
                <a href="mailto:karthik@karthikvinod.com" className="btn-footer-primary">
                  <span>Start a Conversation</span>
                  <span>→</span>
                </a>
                <a href="https://github.com/ItsKarthikVinod" target="_blank" rel="noopener noreferrer" className="btn-footer-secondary">
                  <span>View GitHub</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Right: Contact Channels */}
            <div className="footer-contacts-grid">
              <a href="mailto:karthik@karthikvinod.com" className="footer-contact-item">
                <div className="contact-badge-icon">✉</div>
                <div className="contact-item-info">
                  <span className="contact-item-label">Email</span>
                  <span className="contact-item-value">karthik@karthikvinod.com</span>
                </div>
              </a>
              <a href="https://linkedin.com/in/itskarthikvinod" target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                <div className="contact-badge-icon">💼</div>
                <div className="contact-item-info">
                  <span className="contact-item-label">LinkedIn</span>
                  <span className="contact-item-value">in/itskarthikvinod</span>
                </div>
              </a>
              <a href="https://github.com/ItsKarthikVinod" target="_blank" rel="noopener noreferrer" className="footer-contact-item">
                <div className="contact-badge-icon">🐙</div>
                <div className="contact-item-info">
                  <span className="contact-item-label">GitHub</span>
                  <span className="contact-item-value">github.com/ItsKarthikVinod</span>
                </div>
              </a>
              <div className="footer-contact-item">
                <div className="contact-badge-icon">📍</div>
                <div className="contact-item-info">
                  <span className="contact-item-label">Location</span>
                  <span className="contact-item-value">Available Worldwide • Remote</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Credits / Legal */}
          <div className="sub-footer-bar">
            <div>
              © {new Date().getFullYear()} Karthik Vinod. All rights reserved.
            </div>
            <div>
              Full-Stack Developer • 60 FPS Scroll-Synchronized Canvas
            </div>
          </div>
        </footer>
      </main>

      {/* ───────────────────────────────────────────────
          CERTIFICATE MODAL (Single Aesthetic Box)
      ─────────────────────────────────────────────── */}
      {selectedCert && (
        <div
          className="cert-modal-backdrop"
          onClick={() => setSelectedCert(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="cert-modal-box"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Bar: Issuer & Close */}
            <div className="cert-modal-topbar">
              <div className="cert-modal-issuer-info">
                <div className="cert-modal-issuer-logo">
                  {selectedCert.issuerLogo}
                </div>
                <div>
                  <h4 className="cert-modal-issuer-name">{selectedCert.issuer}</h4>
                  <span className="cert-modal-level">{selectedCert.level || 'Accredited Credential'}</span>
                </div>
              </div>
              <button
                type="button"
                className="cert-modal-close-btn"
                onClick={() => setSelectedCert(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Certificate Picture / Preview Showcase */}
            <div className="cert-modal-picture-wrap">

              <img
                src={selectedCert.image}
                alt={selectedCert.title}
                className="cert-modal-img"
              />

            </div>

            {/* Certificate Details */}
            <div className="cert-modal-content">
              <h3 className="cert-modal-title">{selectedCert.title}</h3>

              <div className="cert-modal-meta-chips">
                <span className="cert-chip">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {selectedCert.issueDate || selectedCert.year}
                </span>


              </div>

              {selectedCert.description && (
                <p className="cert-modal-description">{selectedCert.description}</p>
              )}

              {selectedCert.skills && selectedCert.skills.length > 0 && (
                <div className="cert-modal-skills-list">
                  {selectedCert.skills.map((skill) => (
                    <span key={skill} className="cert-modal-skill-tag">{skill}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}