"use client";

import { useState, useRef, ChangeEvent, FormEvent } from "react";
import { residenceService, type CreateResidenceInput } from "@/services/residenceService";

/* ── option sets ── */
const TYPE_OPTIONS    = ["Ultra Luxury", "Premium", "New Launch"];
const STATUS_OPTIONS  = ["Ready to Move", "Accepting Expressions", "Limited Units", "Sold Out", "New Launch", "Enquire Now"];
const BEDS_OPTIONS    = ["1–2 BHK", "1–3 BHK", "2–4 BHK", "3–5 BHK", "4–5 BHK", "4–6 BHK", "1–3 Bed", "Villas & High-rise"];

const EMPTY: Omit<CreateResidenceInput, "imageId" | "featured"> = {
  name:     "",
  location: "",
  type:     "",
  beds:     "",
  price:    "",
  floors:   "",
  status:   "",
  order:    0,
};

type SubmitState = "idle" | "uploading" | "saving" | "success" | "error";

/* ══════════════════════════════════════════
   FORM
══════════════════════════════════════════ */
export default function ResidenceForm() {
  const [form,       setForm]       = useState(EMPTY);
  const [imageFile,  setImageFile]  = useState<File | null>(null);
  const [preview,    setPreview]    = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg,   setErrorMsg]   = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── field helpers ── */
  const set = (key: keyof typeof EMPTY, value: string | boolean | number) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── validation ── */
  const validate = () => {
    if (!form.name.trim())     return "Name is required.";
    if (!form.location.trim()) return "Location is required.";
    if (!form.type)            return "Please select a type.";
    if (!form.status)          return "Please select a status.";
    if (!form.price.trim())    return "Price is required.";
    if (!form.beds)            return "Please select a configuration.";
    if (!form.floors.trim())   return "Floors is required.";
    return null;
  };

  /* ── submit ── */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const err = validate();
    if (err) { setErrorMsg(err); return; }

    try {
      if (imageFile) {
        setSubmitState("uploading");
      } else {
        setSubmitState("saving");
      }

      await residenceService.createResidence({ ...form, featured: false }, imageFile ?? undefined);

      setSubmitState("success");
      setForm(EMPTY);
      setImageFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = "";

      // reset to idle after 3 s
      setTimeout(() => setSubmitState("idle"), 3000);
    } catch (err: any) {
      setSubmitState("error");
      setErrorMsg(err?.message ?? "Something went wrong. Please try again.");
    }
  };

  const isLoading = submitState === "uploading" || submitState === "saving";

  return (
    <div className="min-h-screen py-24 px-6 lg:px-16" style={{ background: "#FAF6EF", fontFamily: "'Montserrat', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&family=Montserrat:wght@200;300;400;500&display=swap" rel="stylesheet" />

      <div className="max-w-3xl mx-auto">

        {/* ── Header ── */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-px bg-[#B8952A]" />
            <span className="text-[#B8952A] text-[8px] tracking-[0.6em] uppercase font-light">Admin Panel</span>
          </div>
          <h1 className="text-[#1C1610] font-light" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(32px,5vw,52px)" }}>
            Add New <em className="text-[#1C1610]/40">Residence</em>
          </h1>
          <div className="h-px mt-6 bg-gradient-to-r from-[#B8952A]/30 to-transparent" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">

          {/* ── Image Upload ── */}
          <div className="flex flex-col gap-3">
            <Label>Property Image</Label>
            {preview ? (
              <div className="relative w-full aspect-video overflow-hidden border border-[#B8952A]/20"
                style={{ background: "#F0E8D5" }}>
                <img src={preview} alt="preview" className="w-full h-full object-cover" />
                <button type="button" onClick={removeImage}
                  className="absolute top-3 right-3 px-3 py-1.5 text-[8px] tracking-[0.3em] uppercase font-light text-white bg-black/50 hover:bg-black/70 transition-colors duration-300 backdrop-blur-sm">
                  Remove
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()}
                className="w-full aspect-video flex flex-col items-center justify-center gap-3 border border-dashed border-[#B8952A]/30 hover:border-[#B8952A]/60 transition-colors duration-300 cursor-pointer"
                style={{ background: "#F5EDE0" }}>
                <div className="w-8 h-8 border border-[#B8952A]/40 rotate-45 flex items-center justify-center">
                  <span className="text-[#B8952A] text-lg font-light -rotate-45">+</span>
                </div>
                <span className="text-[#1C1610]/40 text-[9px] tracking-[0.4em] uppercase font-light">
                  Click to upload image
                </span>
                <span className="text-[#1C1610]/25 text-[8px] font-light">JPG, PNG, WEBP — max 5MB</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImage}
            />
          </div>

          {/* ── Row: Name + Location ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Property Name *">
              <Input
                value={form.name}
                onChange={v => set("name", v)}
                placeholder="e.g. World One"
              />
            </Field>
            <Field label="Location *">
              <Input
                value={form.location}
                onChange={v => set("location", v)}
                placeholder="e.g. Worli Sea Face, Mumbai"
              />
            </Field>
          </div>

          {/* ── Row: Type + Status ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Type *">
              <Select
                value={form.type}
                onChange={v => set("type", v)}
                options={TYPE_OPTIONS}
                placeholder="Select type"
              />
            </Field>
            <Field label="Status *">
              <Select
                value={form.status}
                onChange={v => set("status", v)}
                options={STATUS_OPTIONS}
                placeholder="Select status"
              />
            </Field>
          </div>

          {/* ── Row: Price + Beds ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Starting Price *">
              <Input
                value={form.price}
                onChange={v => set("price", v)}
                placeholder="e.g. ₹ 12 Cr+"
              />
            </Field>
            <Field label="Configuration *">
              <Select
                value={form.beds}
                onChange={v => set("beds", v)}
                options={BEDS_OPTIONS}
                placeholder="Select config"
              />
            </Field>
          </div>

          {/* ── Row: Floors + Order ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Floors *">
              <Input
                value={form.floors}
                onChange={v => set("floors", v)}
                placeholder="e.g. 117 Floors"
              />
            </Field>
            <Field label="Display Order">
              <input
                type="number"
                min={0}
                value={form.order}
                onChange={e => set("order", Number(e.target.value))}
                className="w-full border border-[#B8952A]/20 focus:border-[#B8952A]/55 px-4 py-3.5 text-[#1C1610]/75 text-[11px] tracking-wider font-light outline-none transition-colors duration-300"
                style={{ background: "rgba(255,255,255,0.7)", fontFamily: "'Montserrat', sans-serif" }}
              />
            </Field>
          </div>

          {/* ── Error message ── */}
          {errorMsg && (
            <div className="px-5 py-4 border border-red-300/40 bg-red-50">
              <p className="text-red-600 text-[10px] tracking-wide font-light">{errorMsg}</p>
            </div>
          )}

          {/* ── Success message ── */}
          {submitState === "success" && (
            <div className="px-5 py-4 border border-emerald-300/40 bg-emerald-50 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rotate-45 flex-shrink-0" />
              <p className="text-emerald-700 text-[10px] tracking-wide font-light">
                Residence added successfully.
              </p>
            </div>
          )}

          {/* ── Submit ── */}
          <div className="flex items-center gap-5 pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="relative group flex-1 sm:flex-none px-12 py-4 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(90deg,#B8952A,#D4B96A,#B8952A)",
                backgroundSize: "200%",
                fontFamily: "'Montserrat', sans-serif",
              }}
            >
              <span className="relative z-10 text-[9px] tracking-[0.45em] uppercase font-medium text-white">
                {submitState === "uploading" && "Uploading Image…"}
                {submitState === "saving"    && "Saving…"}
                {(submitState === "idle" || submitState === "success" || submitState === "error") && "Save Residence"}
              </span>
              {!isLoading && (
                <span className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => { setForm(EMPTY); removeImage(); setErrorMsg(""); setSubmitState("idle"); }}
              className="text-[9px] tracking-[0.4em] uppercase font-light text-[#1C1610]/40 hover:text-[#1C1610]/70 transition-colors duration-300"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              Reset
            </button>
          </div>

          {/* Progress hint */}
          {isLoading && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#B8952A]/15 overflow-hidden">
                <div className="h-full bg-[#B8952A]" style={{ animation: "progressPulse 1.5s ease-in-out infinite", width: "40%" }} />
              </div>
              <span className="text-[#B8952A] text-[8px] tracking-[0.4em] uppercase font-light">
                {submitState === "uploading" ? "Uploading…" : "Saving to Appwrite…"}
              </span>
            </div>
          )}
        </form>
      </div>

      <style>{`
        @keyframes progressPulse {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
}

/* ── Small shared sub-components ── */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[#1C1610]/45 text-[8px] tracking-[0.45em] uppercase font-light block mb-2">
      {children}
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-[#B8952A]/20 focus:border-[#B8952A]/55 px-4 py-3.5 text-[#1C1610]/75 text-[11px] tracking-wider font-light outline-none transition-colors duration-300 placeholder:text-[#1C1610]/20"
      style={{ background: "rgba(255,255,255,0.7)", fontFamily: "'Montserrat', sans-serif" }}
    />
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-[#B8952A]/20 focus:border-[#B8952A]/55 px-4 py-3.5 text-[11px] tracking-wider font-light outline-none transition-colors duration-300 appearance-none cursor-pointer"
      style={{
        background: "rgba(255,255,255,0.7)",
        fontFamily: "'Montserrat', sans-serif",
        color: value ? "rgba(28,22,16,0.75)" : "rgba(28,22,16,0.25)",
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map(o => (
        <option key={o} value={o} style={{ color: "rgba(28,22,16,0.85)" }}>{o}</option>
      ))}
    </select>
  );
}