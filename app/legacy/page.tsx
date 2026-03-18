"use client";

import { useState, useEffect, useRef } from "react";

// ── Banner 1 — between Timeline & Leadership
const SLIDES_1 = [
  
  {
    id: 1,
    image: "https://nyc.cloud.appwrite.io/v1/storage/buckets/69b6331b002098a340ab/files/69b648f4003e426d2c21/view?project=69b6319e002662c7faa5",
    tag: "Architecture · Design",
    headline: "Iconic Forms",
    sub: "Collaborating with the world's\nfinest architectural minds.",
    stat1: { val: "500+", label: "Corporates" },
    stat2: { val: "96%", label: "Occupancy" },
  },
];

// ── Banner 2 — at the bottom
const SLIDES_2 = [
  {
    id: 1,
    image: "https://nyc.cloud.appwrite.io/v1/storage/buckets/69b6331b002098a340ab/files/69b8b506000361153d57/view?project=69b6319e002662c7faa5",
    tag: "Vision · Purpose · Excellence",
    headline: "Our Vision",
    sub: "Not just buildings — but stages\nwhere life unfolds beautifully.",
    stat1: { val: "₹35,000", label: "Cr Revenue" },
    stat2: { val: "2021", label: "BSE Listed" },
  },
  {
    id: 2,
    image: "https://nyc.cloud.appwrite.io/v1/storage/buckets/69b6331b002098a340ab/files/69b8b50a0003f0c88394/view?project=69b6319e002662c7faa5",
    tag: "Begin Your Journey",
    headline: "Your Address",
    sub: "Find the address that defines\nyour chapter of extraordinary.",
    stat1: { val: "34+", label: "Projects" },
    stat2: { val: "1995", label: "Founded" },
  },
  {
    id: 3,
    image: "https://nyc.cloud.appwrite.io/v1/storage/buckets/69b6331b002098a340ab/files/69b8b500001bea20bb86/view?project=69b6319e002662c7faa5&mode=admin",
    tag: "Private Concierge",
    headline: "Let's Connect",
    sub: "Our advisors are available\nexclusively for you.",
    stat1: { val: "24×7", label: "Available" },
    stat2: { val: "4", label: "Global Offices" },
  },
];

function HeroBanner({ slides, ctaLabel = "Explore Our Story" }: {
  slides: typeof SLIDES_1;
  ctaLabel?: string;
}) {
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = (next: number) => {
    if (leaving || next === current) return;
    setLeaving(true);
    setTimeout(() => { setCurrent(next); setLeaving(false); }, 480);
  };

  useEffect(() => {
    timer.current = setTimeout(() => goTo((current + 1) % slides.length), 5500);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [current, leaving]);

  const s = slides[current];

  return (
    <div className="relative w-full overflow-hidden" style={{ height: "90vh", minHeight: 520, maxHeight: 820 }}>

      {/* Background image */}
      <div
        key={current}
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${s.image})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: leaving
            ? "bExit 0.48s ease-in forwards"
            : "bEnter 0.9s cubic-bezier(0.2,0,0.4,1) forwards",
        }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0D0A06]/82 via-[#0D0A06]/44 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0A06]/65 via-transparent to-[#0D0A06]/18" />

      {/* Left gold bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-[#B8952A]/75 to-transparent" />

      {/* Content */}
      <div className="relative z-10 h-full max-w-[1320px] mx-auto px-6 lg:px-16 flex flex-col justify-end pb-20 lg:pb-28">

        {/* Tag */}
        <div key={`t-${current}`} className="flex items-center gap-3 mb-5"
          style={{ animation: "fUp 0.7s 0.10s both" }}>
          <div className="w-6 h-px bg-[#B8952A]" />
          <span
            className="text-[#B8952A] text-[9px] tracking-[0.55em] uppercase font-light px-3 py-1.5 border border-[#B8952A]/40"
            style={{ background: "rgba(184,149,42,0.08)", backdropFilter: "blur(8px)", fontFamily: "'Montserrat', sans-serif" }}>
            {s.tag}
          </span>
        </div>

        {/* Headline */}
        <div key={`h-${current}`} className="overflow-hidden mb-4"
          style={{ animation: "fUp 0.8s 0.22s both" }}>
          <h1 className="text-white font-light leading-none"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(60px,10vw,128px)",
              letterSpacing: "-0.02em",
              textShadow: "0 4px 40px rgba(0,0,0,0.35)",
            }}>
            {s.headline}
          </h1>
        </div>

        {/* Gold rule */}
        <div key={`r-${current}`} className="flex items-center gap-3 mb-5"
          style={{ animation: "sX 0.65s 0.38s both", transformOrigin: "left" }}>
          <div className="h-px w-14 bg-gradient-to-r from-[#B8952A] to-[#D4B96A]" />
          <div className="w-1.5 h-1.5 bg-[#B8952A] rotate-45 flex-shrink-0" />
          <div className="h-px w-8 bg-[#B8952A]/30" />
        </div>

        {/* Sub */}
        <p key={`s-${current}`}
          className="text-white/52 font-light leading-relaxed mb-10 max-w-md"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(15px,2vw,20px)",
            fontStyle: "italic",
            animation: "fUp 0.8s 0.44s both",
            whiteSpace: "pre-line",
          }}>
          {s.sub}
        </p>

        {/* Bottom row */}
        <div key={`b-${current}`}
          className="flex flex-col sm:flex-row items-start sm:items-end gap-6"
          style={{ animation: "fUp 0.7s 0.54s both" }}>

          {/* Stats glass card */}
          <div className="flex items-stretch border border-[#B8952A]/25"
            style={{ background: "rgba(13,10,6,0.55)", backdropFilter: "blur(12px)" }}>
            {[s.stat1, s.stat2].map((st, idx) => (
              <div key={idx}
                className={`px-6 py-4 flex flex-col gap-0.5 ${idx === 0 ? "border-r border-[#B8952A]/20" : ""}`}>
                <p className="text-white font-light leading-none"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26 }}>{st.val}</p>
                <p className="text-[#B8952A] text-[8px] tracking-[0.45em] uppercase font-light mt-0.5"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}>{st.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button
            className="group relative px-8 py-4 overflow-hidden flex items-center gap-3"
            style={{
              background: "linear-gradient(90deg,#B8952A,#D4B96A,#B8952A)",
              backgroundSize: "200%",
              fontFamily: "'Montserrat', sans-serif",
            }}>
            <span className="relative z-10 text-[9px] tracking-[0.45em] uppercase font-medium text-white">
              {ctaLabel}
            </span>
            <span className="relative z-10 w-5 h-px bg-white group-hover:w-8 transition-all duration-300" />
            <span className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
          </button>

          {/* Counter + dots */}
          <div className="sm:ml-auto flex items-center gap-5">
            <span className="text-white/30 text-[9px] tracking-[0.3em]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}>
              0{current + 1} / 0{slides.length}
            </span>
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} aria-label={`Slide ${i + 1}`}
                  className="relative overflow-hidden transition-all duration-500"
                  style={{
                    height: 2,
                    width: i === current ? 32 : 8,
                    background: i === current ? "#B8952A" : "rgba(255,255,255,0.25)",
                  }}>
                  {i === current && (
                    <span className="absolute inset-0 bg-[#D4B96A]"
                      style={{
                        animation: "pFill 5.5s linear forwards",
                        transformOrigin: "left",
                        transform: "scaleX(0)",
                      }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
        <div className="w-px h-9 overflow-hidden bg-white/10">
          <div className="w-full bg-[#B8952A]"
            style={{ height: "50%", animation: "sPulse 2s ease-in-out infinite" }} />
        </div>
        <span className="text-white/20 text-[7px] tracking-[0.5em] uppercase"
          style={{ fontFamily: "'Montserrat', sans-serif" }}>Scroll</span>
      </div>

      <style>{`
        @keyframes bEnter  { from{opacity:0;transform:scale(1.05)} to{opacity:1;transform:scale(1)} }
        @keyframes bExit   { from{opacity:1;transform:scale(1)}    to{opacity:0;transform:scale(0.97)} }
        @keyframes fUp     { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sX      { from{opacity:0;transform:scaleX(0)}        to{opacity:1;transform:scaleX(1)} }
        @keyframes pFill   { from{transform:scaleX(0)} to{transform:scaleX(1)} }
        @keyframes sPulse  { 0%{transform:translateY(-100%);opacity:0} 50%{opacity:1} 100%{transform:translateY(200%);opacity:0} }
      `}</style>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────

const MILESTONES = [
  { year: "1995", title: "The Beginning", desc: "LATEEF SHAIKH ASHRAFI founds the company with a single plot in Mumbai's suburban heartland." },
  { year: "2003", title: "First Landmark", desc: "Lodha completes its first premium residential tower in Thane — setting a new benchmark for quality." },
  { year: "2008", title: "International Ambitions", desc: "Lodha acquires the iconic Former Canadian High Commission site in London's West End." },
  { year: "2010", title: "World One Announced", desc: "The world's tallest residential tower is unveiled — an architectural marvel at 442 metres." },
  { year: "2012", title: "Palava City", desc: "Launch of Palava — India's first planned smart city spanning 4,500 acres near Mumbai." },
  { year: "2015", title: "London Debut", desc: "Lincoln Square completes — Lodha's first international project redefines prime London living." },
  { year: "2021", title: "Stock Market Listing", desc: "Lodha lists on NSE & BSE — becoming one of India's most valued real estate companies." },
  { year: "2024", title: "30 Years of Legacy", desc: "42,000+ homes delivered. ₹35,000 Cr+ revenue. A legacy built one extraordinary address at a time." },
];

const AWARDS = [
  "CREDAI National Award — Best Luxury Project 2023",
  "Euromoney — Best Residential Developer India 2022",
  "Times of India — Most Trusted Real Estate Brand 2023",
  "Forbes Asia — Best Under a Billion Companies 2021",
  "RICS Award — Residential Development of the Year 2022",
  "Financial Times — Asia Pacific Innovative Lawyers 2023",
];

const LEADERSHIP = [
  { name: "LATEEF SHAIKH ASHRAFI", role: "Founder & Chairman", note: "Vision. Purpose. Legacy." },
  { name: "QATADA SIDDIQUE", role: "Managing Director & CEO", note: "Growth. Innovation. Excellence." },
  { name: "LQ PRESTIGE", role: "CFO", note: "Discipline. Transparency. Scale." },
];

// ── Page ──────────────────────────────────────────────

export default function LegacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "#FAF6EF", fontFamily: "'Montserrat', sans-serif" }}>

      {/* ── Hero text ── */}
      <div className="relative pt-44 pb-32 overflow-hidden">
// DARKER
<div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1C1610 0%,#2A1F0F 40%,#3D2B12 100%)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_70%_at_80%_40%,rgba(184,149,42,0.07)_0%,transparent_65%)]" />
        <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none select-none overflow-hidden">
          <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(200px,30vw,420px)", lineHeight: 1, color: "rgba(184,149,42,0.06)" }}>1995</span>
        </div>
        <div className="relative max-w-[1320px] mx-auto px-6 lg:px-16 flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="w-5 h-px bg-[#B8952A]" />
            <span className="text-[#B8952A] text-[8px] tracking-[0.6em] uppercase font-light">Est. 1995</span>
          </div>
          <h1 className="text-white/90 font-light leading-none"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(52px,8vw,100px)" }}>
            Our <em className="text-white/45">Legacy</em>
          </h1>
          <div className="h-px w-20 bg-gradient-to-r from-[#B8952A] to-transparent" />
          <p className="text-white/45 font-light leading-relaxed max-w-xl"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(16px,2vw,20px)", fontStyle: "italic" }}>
            "We believe that great architecture is not just about buildings. It is about creating a stage on which human life can unfold beautifully."
          </p>
          <p className="text-[#B8952A] text-[8px] tracking-[0.5em] uppercase font-light">— LATEEF SHAIKH ASHRAFI, Founder</p>
        </div>
      </div>

      {/* ── Timeline ── */}
      <div className="border-t border-[#B8952A]/15 py-24" style={{ background: "#FAF6EF" }}>
        <div className="max-w-[1320px] mx-auto px-6 lg:px-16">
          <div className="mb-14">
            <p className="text-[#B8952A] text-[8px] tracking-[0.5em] uppercase font-light mb-2">Journey</p>
            <h2 className="text-[#1C1610]/85 font-light"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,4vw,46px)" }}>
              Three Decades of <em className="text-[#1C1610]/35">Milestones</em>
            </h2>
          </div>
          <div className="relative">
            <div className="absolute left-[88px] top-0 bottom-0 w-px bg-gradient-to-b from-[#B8952A]/30 via-[#B8952A]/15 to-transparent hidden md:block" />
            <div className="flex flex-col gap-0">
              {MILESTONES.map((m, i) => (
                <div key={m.year} className="group relative flex gap-12 items-start">
                  <div className="w-20 flex-shrink-0 pt-8 text-right hidden md:block">
                    <p className="font-light transition-colors duration-300 group-hover:text-[#B8952A]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", color: i === MILESTONES.length - 1 ? "#B8952A" : "rgba(28,22,16,0.30)" }}>
                      {m.year}
                    </p>
                  </div>
                  <div className="hidden md:flex flex-col items-center flex-shrink-0 pt-10">
                    <div className="w-2 h-2 rotate-45 transition-all duration-300 group-hover:scale-150"
                      style={{ background: i === MILESTONES.length - 1 ? "#B8952A" : "rgba(28,22,16,0.15)" }} />
                  </div>
                  <div className={`flex-1 py-8 border-b border-[#B8952A]/10 ${i === MILESTONES.length - 1 ? "border-b-0" : ""}`}>
                    <p className="text-[#B8952A] text-[7px] tracking-[0.5em] uppercase font-light mb-2 md:hidden">{m.year}</p>
                    <h3 className="text-[#1C1610]/80 font-light group-hover:text-[#1C1610] transition-colors duration-300 mb-2"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(18px,2.5vw,24px)" }}>{m.title}</h3>
                    <p className="text-[#1C1610]/40 text-[11px] font-light leading-relaxed tracking-wide">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── BANNER 1 — between Timeline & Leadership ── */}
      <HeroBanner slides={SLIDES_1} ctaLabel="Our Milestones" />

      {/* ── Leadership ── */}
      <div className="border-t border-[#B8952A]/12 py-24" style={{ background: "#F5EDE0" }}>
        <div className="max-w-[1320px] mx-auto px-6 lg:px-16">
          <div className="text-center mb-14">
            <p className="text-[#B8952A] text-[8px] tracking-[0.5em] uppercase font-light mb-3">Stewardship</p>
            <h2 className="text-[#1C1610]/85 font-light"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,4vw,46px)" }}>
              The <em className="text-[#1C1610]/35">Leaders</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px border border-[#B8952A]/15 bg-[#B8952A]/15">
            {LEADERSHIP.map((l) => (
              <div key={l.name} className="group px-10 py-12 flex flex-col gap-4 text-center hover:bg-white/50 transition-colors duration-500"
                style={{ background: "#F5EDE0" }}>
                <div className="w-16 h-16 border border-[#B8952A]/25 rotate-45 mx-auto group-hover:border-[#B8952A]/55 transition-colors duration-500" />
                <div>
                  <h3 className="text-[#1C1610]/85 font-light group-hover:text-[#1C1610] transition-colors duration-300"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px" }}>{l.name}</h3>
                  <p className="text-[#B8952A] text-[7px] tracking-[0.5em] uppercase font-light mt-1.5">{l.role}</p>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-[#B8952A]/25 to-transparent" />
                <p className="text-[#1C1610]/38 font-light italic text-[13px]"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}>{l.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Awards ── */}
      <div className="border-t border-[#B8952A]/12 py-20" style={{ background: "#FAF6EF" }}>
        <div className="max-w-[1320px] mx-auto px-6 lg:px-16">
          <div className="mb-12">
            <p className="text-[#B8952A] text-[8px] tracking-[0.5em] uppercase font-light mb-2">Recognition</p>
            <h2 className="text-[#1C1610]/85 font-light"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(26px,3.5vw,42px)" }}>
              Accolades & <em className="text-[#1C1610]/35">Honours</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px border border-[#B8952A]/12 bg-[#B8952A]/12">
            {AWARDS.map((award) => (
              <div key={award} className="group px-7 py-7 flex items-start gap-4 hover:bg-[#F5EDE0] transition-colors duration-400"
                style={{ background: "#FAF6EF" }}>
                <div className="w-1.5 h-1.5 bg-[#B8952A]/35 rotate-45 mt-1 flex-shrink-0 group-hover:bg-[#B8952A] transition-colors duration-300" />
                <p className="text-[#1C1610]/50 text-[11px] font-light leading-relaxed tracking-wide group-hover:text-[#1C1610]/75 transition-colors duration-300">{award}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      

      {/* ── BANNER 2 — at the bottom ── */}
      <HeroBanner slides={SLIDES_2} ctaLabel="Begin Your Journey" />

      {/* ── DUAL SMALL BANNERS ── */}
<div className="grid grid-cols-1 md:grid-cols-2">

  {/* Left */}
  <div className="relative overflow-hidden" style={{ height: 280 }}>
    <div className="absolute inset-0" style={{
      backgroundImage: `url(/legacy/le1.jpg)`,
      backgroundSize: "cover", backgroundPosition: "center",
    }} />
    <div className="absolute inset-0 bg-[#0D0A06]/65" />
    <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-[#B8952A]/75 to-transparent" />
    <div className="relative z-10 h-full flex flex-col justify-center px-10 gap-3">
      <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light" style={{ fontFamily: "'Montserrat', sans-serif" }}>Est. 1995</p>
      <h3 className="text-white font-light leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,4vw,44px)" }}>
        Where It<br /><em className="text-white/40">All Began</em>
      </h3>
    </div>
  </div>

  {/* Right */}
  <div className="relative overflow-hidden" style={{ height: 280 }}>
    <div className="absolute inset-0" style={{
      backgroundImage: `url(/legacy/le2.jpg)`,
      backgroundSize: "cover", backgroundPosition: "center",
    }} />
    <div className="absolute inset-0 bg-[#0D0A06]/65" />
    <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-transparent via-[#B8952A]/75 to-transparent" />
    <div className="relative z-10 h-full flex flex-col justify-center items-end text-right px-10 gap-3">
      <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light" style={{ fontFamily: "'Montserrat', sans-serif" }}>4 Nations</p>
      <h3 className="text-white font-light leading-tight" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,4vw,44px)" }}>
        A World of<br /><em className="text-white/40">Addresses</em>
      </h3>
    </div>
  </div>

</div>

    </div>
  );
}