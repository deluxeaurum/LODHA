"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { residenceService, type Residence } from "@/services/residenceService";

const FILTERS = ["All", "Ultra Luxury", "Premium", "Ready to Move", "New Launch"];

/* ── Fallback SVG if no image uploaded yet ── */
const BuildingSVG = ({ seed }: { seed: number }) => {
  const h = 280 + (seed % 5) * 28;
  const w = 48 + (seed % 4) * 10;
  const x = (240 - w) / 2;
  return (
    <svg viewBox="0 0 240 400" fill="none" className="absolute inset-0 w-full h-full">
      {Array.from({ length: 18 }).map((_, i) => (
        <circle key={i} cx={10 + (i * 51) % 220} cy={5 + (i * 15) % 55} r={0.6 + (i % 3) * 0.3} fill="rgba(184,149,42,0.3)" />
      ))}
      <rect x={x} y={400 - h} width={w} height={h} fill="rgba(184,149,42,0.07)" />
      {Array.from({ length: Math.floor(h / 12) }).map((_, i) => (
        <rect key={i} x={x + 2} y={402 - h + i * 12} width={w - 4} height={9} fill={`rgba(184,149,42,${0.04 + (i % 4) * 0.015})`} />
      ))}
      {Array.from({ length: Math.floor(w / 10) }).map((_, c) =>
        Array.from({ length: Math.floor(h / 16) }).map((_, r) => (
          <rect key={`${c}-${r}`} x={x + 4 + c * 9} y={404 - h + 4 + r * 14} width="5" height="8"
            fill={((c + r + seed) % 3 === 0) ? "rgba(184,149,42,0.45)" : "rgba(184,149,42,0.08)"} />
        ))
      )}
      {seed % 2 === 0 && (
        <polygon points={`${x + w / 2},${400 - h - 20} ${x + w / 2 - 3},${400 - h} ${x + w / 2 + 3},${400 - h}`} fill="rgba(184,149,42,0.5)" />
      )}
      <ellipse cx="120" cy="396" rx={w * 0.8} ry="6" fill="rgba(184,149,42,0.08)" />
    </svg>
  );
};

const statusStyle = (status: string) => {
  if (status === "Ready to Move") return "text-emerald-700 border-emerald-400/50 bg-emerald-50";
  if (status === "Sold Out")      return "text-red-600 border-red-300/50 bg-red-50";
  if (status === "New Launch")    return "text-[#B8952A] border-[#B8952A]/40 bg-amber-50";
  return "text-[#1C1610]/55 border-[#1C1610]/15 bg-white/60";
};

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div className="border border-[#B8952A]/12 overflow-hidden animate-pulse" style={{ background: "#FBF7F0" }}>
    <div className="aspect-[2/3]" style={{ background: "linear-gradient(160deg,#EDE3CC,#E5D9BC)" }} />
    <div className="p-5 flex flex-col gap-3">
      <div className="h-2 w-24 rounded" style={{ background: "#E5D9BC" }} />
      <div className="h-5 w-36 rounded" style={{ background: "#EDE3CC" }} />
      <div className="h-px" style={{ background: "rgba(184,149,42,0.15)" }} />
      <div className="flex justify-between">
        <div className="h-4 w-20 rounded" style={{ background: "#E5D9BC" }} />
        <div className="h-4 w-16 rounded" style={{ background: "#E5D9BC" }} />
      </div>
    </div>
  </div>
);

export default function ResidencesPage() {
  const [all,          setAll]          = useState<Residence[]>([]);
  const [filtered,     setFiltered]     = useState<Residence[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [hovered,      setHovered]      = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);

  /* ── fetch all on mount ── */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await residenceService.getAllResidences();
        setAll(data);
        console.log(data)
        setFiltered(data);
      } catch {
        setError("Unable to load residences. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── re-fetch when filter changes ── */
  useEffect(() => {
    if (!all.length) return;

    (async () => {
      try {
        setLoading(true);

        if (activeFilter === "All") {
          setFiltered(all);
          return;
        }

        const TYPE_FILTERS   = ["Ultra Luxury", "Premium", "New Launch"];
        const STATUS_FILTERS = ["Ready to Move"];

        let data: Residence[] = [];

        if (TYPE_FILTERS.includes(activeFilter)) {
          data = await residenceService.listResidences({ type: activeFilter });
        } else if (STATUS_FILTERS.includes(activeFilter)) {
          data = await residenceService.listResidences({ status: activeFilter });
        }

        setFiltered(data);
      } catch {
        // fallback: client-side filter from cached `all`
        setFiltered(
          all.filter(r => r.type === activeFilter || r.status === activeFilter)
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [activeFilter]);

  return (
    <div className="min-h-screen" style={{ background: "#FAF6EF", fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap" rel="stylesheet" />

      {/* ══ HERO ══ */}
      <div className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#F5EDE0 0%,#FAF6EF 60%)" }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(184,149,42,0.08)_0%,transparent_70%)]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(184,149,42,1) 1px,transparent 1px),linear-gradient(90deg,rgba(184,149,42,1) 1px,transparent 1px)", backgroundSize: "60px 60px" }} />
        <div className="absolute top-28 left-6 lg:left-16 w-12 h-12 border-l border-t border-[#B8952A]/30" />
        <div className="absolute top-28 right-6 lg:right-16 w-12 h-12 border-r border-t border-[#B8952A]/30" />

        <div className="relative max-w-[1320px] mx-auto px-6 lg:px-16 flex flex-col items-center text-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-px bg-[#B8952A]/60" />
            <span className="text-[#B8952A] text-[8px] tracking-[0.6em] uppercase font-light">Our Portfolio</span>
            <div className="w-6 h-px bg-[#B8952A]/60" />
          </div>
          <h1 className="text-[#1C1610] font-light leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(44px,7vw,88px)" }}>
            Signature <em className="text-[#1C1610]/40">Residences</em>
          </h1>
          <p className="text-[#1C1610]/45 font-light max-w-lg leading-relaxed"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(15px,1.8vw,19px)", fontStyle: "italic" }}>
            Each address, a masterpiece. Crafted for those who demand nothing less than extraordinary.
          </p>
        </div>
      </div>

      {/* ══ FILTER BAR ══ */}
      <div className="sticky top-20 z-40 border-y border-[#B8952A]/15"
        style={{ background: "rgba(250,246,239,0.92)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-[1320px] mx-auto px-6 lg:px-16">
          <div className="flex items-center overflow-x-auto scrollbar-none">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-4 text-[9px] tracking-[0.45em] uppercase font-light whitespace-nowrap transition-all duration-300 border-b-2 ${
                  activeFilter === f
                    ? "text-[#B8952A] border-[#B8952A]"
                    : "text-[#1C1610]/35 border-transparent hover:text-[#1C1610]/65"
                }`}>
                {f}
              </button>
            ))}
            <div className="ml-auto pl-8 pr-2 text-[#1C1610]/30 text-[9px] tracking-[0.3em] uppercase font-light whitespace-nowrap">
              {loading ? "—" : `${filtered.length} Properties`}
            </div>
          </div>
        </div>
      </div>

      {/* ══ GRID ══ */}
      <div className="max-w-[1320px] mx-auto px-6 lg:px-16 py-16">

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center py-24 gap-4">
            <p className="text-red-500/60 text-[11px] tracking-wide font-light">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light underline underline-offset-4">
              Try Again
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center py-24 gap-3">
            <div className="w-1.5 h-1.5 bg-[#B8952A]/30 rotate-45" />
            <p className="text-[#1C1610]/30 text-[11px] tracking-wide font-light">
              No properties found for this filter.
            </p>
          </div>
        )}

        {/* Cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map((r, index) => (
              <div
                key={r.$id}
                className="group relative cursor-pointer"
                onMouseEnter={() => setHovered(r.$id)}
                onMouseLeave={() => setHovered(null)}
              >
                <div
                  className={`border transition-all duration-700 overflow-hidden ${
                    hovered === r.$id
                      ? "border-[#B8952A]/40 shadow-[0_8px_40px_rgba(184,149,42,0.12)]"
                      : "border-[#B8952A]/12"
                  }`}
                  style={{ background: hovered === r.$id ? "#FFFDF8" : "#FBF7F0" }}
                >
                  {/* Image / SVG fallback */}
                  <div
                    className="relative aspect-[2/3] overflow-hidden"
                    style={{ background: "linear-gradient(160deg,#F0E8D5 0%,#EDE3CC 100%)" }}
                  >
                    {r.imageId ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_RESIDENCE_BUCKET_ID}/files/${r.imageId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`}
                        alt={r.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <BuildingSVG seed={index * 3 + 1} />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#EDE3CC]/80 via-transparent to-transparent" />

                    {/* Status badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`text-[7px] tracking-[0.4em] uppercase font-light px-3 py-1.5 border ${statusStyle(r.status)}`}>
                        {r.status}
                      </span>
                    </div>

                    {/* Floors */}
                    <div className="absolute top-3 right-3">
                      <span className="text-[#1C1610]/30 text-[7px] tracking-[0.3em] uppercase font-light">
                        {r.floors}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col gap-3">
                    <div>
                      <p className="text-[#B8952A] text-[7px] tracking-[0.5em] uppercase font-light">{r.location}</p>
                      <h3
                        className="text-[#1C1610]/85 font-light mt-1.5 group-hover:text-[#1C1610] transition-colors duration-300"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(17px,2vw,21px)" }}
                      >
                        {r.name}
                      </h3>
                    </div>

                    <div className="h-px bg-gradient-to-r from-[#B8952A]/25 to-transparent group-hover:from-[#B8952A]/55 transition-all duration-700" />

                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[#1C1610]/30 text-[7px] tracking-[0.4em] uppercase font-light">Starting</p>
                        <p
                          className="text-[#1C1610]/80 font-light mt-0.5"
                          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
                        >
                          {r.price}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[#1C1610]/30 text-[7px] tracking-[0.4em] uppercase font-light">Config</p>
                        <p className="text-[#1C1610]/55 text-[10px] font-light mt-0.5">{r.beds}</p>
                      </div>
                    </div>

                    {/* Hover CTA */}
                    <div className={`flex items-center gap-2 pt-1 transition-all duration-500 ${
                      hovered === r.$id ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
                    }`}>
                      <span className="text-[#B8952A] text-[7px] tracking-[0.45em] uppercase font-light">
                        View Details
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-[#B8952A]/50 to-transparent" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ CTA ══ */}
      <div className="border-t border-[#B8952A]/12 py-20 text-center" style={{ background: "#F5EDE0" }}>
        <p className="text-[#1C1610]/35 text-[8px] tracking-[0.5em] uppercase font-light mb-4">
          Can't find what you're looking for?
        </p>
        <h3
          className="text-[#1C1610]/80 font-light mb-6"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(24px,3vw,36px)" }}
        >
          Speak with a Private Advisor
        </h3>
        <Link href="/contact">
          <button
            className="px-10 py-4 text-[9px] tracking-[0.45em] uppercase font-medium text-white"
            style={{
              background: "linear-gradient(90deg,#B8952A,#D4B96A,#B8952A)",
              backgroundSize: "200%",
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            Request Private Consultation
          </button>
        </Link>
      </div>
    </div>
  );
}