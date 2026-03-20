"use client";

import { useState, useEffect, useRef } from "react";
import { databases, storage, DATABASE_ID, RESIDENCES_COLLECTION_ID } from "@/lib/appwrite";
import { config } from "@/lib/config";
import { resolveImage } from "@/lib/utils";           // ✅ use shared helper
import { ID, Models, Query } from "appwrite";

/* ══════════════════════════════════════════════════════════
   TYPES
   NOTE: field is "imageId" (Appwrite file $id), NOT "imageUrl"
══════════════════════════════════════════════════════════ */
interface Residence extends Models.Document {
  name:     string;
  location: string;
  type:     string;
  beds:     string;
  price:    string;
  status:   string;
  floors:   string;
  imageId:  string;   // ✅ stores Appwrite Storage file $id
}

/* ══════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════ */
const EMPTY_FORM = {
  name:     "",
  location: "",
  type:     "Ultra Luxury",
  beds:     "",
  price:    "",
  status:   "Ready to Move",
  floors:   "",
  imageId:  "",       // ✅ imageId, not imageUrl
};

const TYPE_OPTIONS = ["Ultra Luxury", "Premium", "New Launch"];
const STATUS_OPTIONS = [
  "Ready to Move",
  "Accepting Expressions",
  "Limited Units",
  "Sold Out",
  "New Launch",
  "Enquire Now",
];

/* ══════════════════════════════════════════════════════════
   STATUS BADGE STYLE
══════════════════════════════════════════════════════════ */
const statusStyle = (s: string) => {
  if (s === "Ready to Move")  return "text-emerald-700 border-emerald-400/50 bg-emerald-50";
  if (s === "Sold Out")       return "text-red-600 border-red-300/50 bg-red-50";
  if (s === "New Launch")     return "text-[#B8952A] border-[#B8952A]/40 bg-amber-50";
  if (s === "Limited Units")  return "text-amber-700 border-amber-400/40 bg-amber-50";
  return "text-[#1C1610]/50 border-[#1C1610]/15 bg-white/60";
};

/* ══════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
══════════════════════════════════════════════════════════ */
const Field = ({
  label, value, onChange, placeholder, required = false, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; hint?: string;
}) => (
  <div className="flex flex-col gap-2">
    <label className="flex items-center gap-2">
      <span className="text-[#1C1610]/40 text-[8px] tracking-[0.45em] uppercase font-light">{label}</span>
      {required && <span className="w-1 h-1 rounded-full bg-[#B8952A]/60" />}
    </label>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-[#B8952A]/15 bg-white/70 px-4 py-3 text-[#1C1610]/75 font-light outline-none focus:border-[#B8952A]/50 focus:bg-white transition-all duration-300 placeholder:text-[#1C1610]/20"
      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px" }}
    />
    {hint && <p className="text-[#1C1610]/25 text-[9px] font-light">{hint}</p>}
  </div>
);

const SelectField = ({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void; options: string[];
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-[#1C1610]/40 text-[8px] tracking-[0.45em] uppercase font-light">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-[#B8952A]/15 bg-white/70 px-4 py-3 text-[#1C1610]/75 font-light outline-none focus:border-[#B8952A]/50 focus:bg-white transition-all duration-300 appearance-none cursor-pointer"
      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "15px" }}
    >
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const [residences,     setResidences]     = useState<Residence[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [deleting,       setDeleting]       = useState<string | null>(null);
  const [toast,          setToast]          = useState<{ msg: string; ok: boolean } | null>(null);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [editingId,      setEditingId]      = useState<string | null>(null);
  const [view,           setView]           = useState<"list" | "form">("list");
  const [deleteConfirm,  setDeleteConfirm]  = useState<string | null>(null);
  const [search,         setSearch]         = useState("");

  // imagePreview is just for local display — stores either:
  // - a blob URL (just-picked local file, before upload)
  // - resolveImage(imageId) (already saved to Appwrite)
  const [imagePreview, setImagePreview] = useState<string>("");

  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Toast helper ── */
  const notify = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Form field setter ── */
  const f = (k: keyof typeof EMPTY_FORM) => (v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  /* ══════════════════════════════════════════════════════════
     FETCH ALL RESIDENCES
  ══════════════════════════════════════════════════════════ */
  const fetchResidences = async () => {
    try {
      setLoading(true);
      const res = await databases.listDocuments(
        DATABASE_ID,
        RESIDENCES_COLLECTION_ID,
        [Query.limit(100)]
      );
      setResidences(res.documents as unknown as Residence[]);
    } catch {
      notify("Failed to fetch residences.", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResidences(); }, []);

  /* ══════════════════════════════════════════════════════════
     IMAGE UPLOAD
     - Uploads file to Appwrite Storage bucket
     - Gets back file.$id
     - Saves $id into form.imageId   ✅
     - resolveImage($id) used for preview
  ══════════════════════════════════════════════════════════ */
  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Show local blob preview immediately so user sees the image
    const localBlob = URL.createObjectURL(file);
    setImagePreview(localBlob);

    try {
      setUploading(true);

      // Upload to Appwrite Storage
      const uploaded = await storage.createFile(
        config.residenceBucketId,   // ✅ from config, same bucket as residenceService
        ID.unique(),
        file
      );

      // Save only the file $id into form — NOT the full URL
      // resolveImage() in utils.ts will build the URL when displaying
      setForm((p) => ({ ...p, imageId: uploaded.$id }));

      // Update preview to use the resolved Appwrite URL
      setImagePreview(resolveImage(uploaded.$id));

      notify("Image uploaded successfully.");
    } catch {
      notify("Image upload failed. Check Appwrite bucket permissions.", false);
      setImagePreview("");
      setForm((p) => ({ ...p, imageId: "" }));
    } finally {
      setUploading(false);
    }
  };

  /* ══════════════════════════════════════════════════════════
     CREATE / UPDATE RESIDENCE
  ══════════════════════════════════════════════════════════ */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.location || !form.beds) {
      notify("Name, location and beds are required.", false);
      return;
    }

    try {
      setSaving(true);

      // Only send fields that exist in Appwrite collection schema
      const payload = {
        name:     form.name,
        location: form.location,
        type:     form.type,
        beds:     form.beds,
        price:    form.price,
        floors:   form.floors,
        status:   form.status,
        imageId:  form.imageId,  // ✅ Appwrite file $id
      };

      if (editingId) {
        await databases.updateDocument(DATABASE_ID, RESIDENCES_COLLECTION_ID, editingId, payload);
        notify("Residence updated.");
      } else {
        await databases.createDocument(DATABASE_ID, RESIDENCES_COLLECTION_ID, ID.unique(), payload);
        notify("Residence created.");
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      setImagePreview("");
      setView("list");
      fetchResidences();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      notify(msg, false);
    } finally {
      setSaving(false);
    }
  };

  /* ══════════════════════════════════════════════════════════
     EDIT
  ══════════════════════════════════════════════════════════ */
  const handleEdit = (r: Residence) => {
    setForm({
      name:     r.name,
      location: r.location,
      type:     r.type     ?? "Ultra Luxury",
      beds:     r.beds,
      price:    r.price    ?? "",
      status:   r.status   ?? "Ready to Move",
      floors:   r.floors   ?? "",
      imageId:  r.imageId  ?? "",   // ✅ imageId from document
    });
    // resolveImage builds the correct Appwrite preview URL from the stored $id
    setImagePreview(resolveImage(r.imageId));
    setEditingId(r.$id);
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ══════════════════════════════════════════════════════════
     DELETE
  ══════════════════════════════════════════════════════════ */
  const handleDelete = async (id: string, imageId?: string) => {
    try {
      setDeleting(id);

      // Delete image from Storage first if it exists
      if (imageId) {
        try {
          await storage.deleteFile(config.residenceBucketId, imageId);
        } catch {
          // If image delete fails, still delete the document
        }
      }

      await databases.deleteDocument(DATABASE_ID, RESIDENCES_COLLECTION_ID, id);
      notify("Deleted successfully.");
      setDeleteConfirm(null);
      fetchResidences();
    } catch {
      notify("Delete failed.", false);
    } finally {
      setDeleting(null);
    }
  };

  /* ── Reset to list view ── */
  const goList = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setImagePreview("");
    setView("list");
  };

  /* ── Filtered list ── */
  const filtered = residences.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase())
  );

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: "#FAF6EF", fontFamily: "'Montserrat', sans-serif" }}>

      {/* Subtle grid bg */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: "linear-gradient(rgba(184,149,42,1) 1px,transparent 1px),linear-gradient(90deg,rgba(184,149,42,1) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 border shadow-lg transition-all duration-300
          ${toast.ok
            ? "border-emerald-400/30 bg-emerald-50 text-emerald-700"
            : "border-red-300/40 bg-red-50 text-red-600"
          }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${toast.ok ? "bg-emerald-500" : "bg-red-500"}`} />
          <p className="text-[10px] tracking-[0.35em] uppercase font-light">{toast.msg}</p>
        </div>
      )}

      {/* ══ TOP NAV ══ */}
      <div
        className="sticky top-0 z-40 border-b border-[#B8952A]/15"
        style={{ background: "rgba(250,246,239,0.94)", backdropFilter: "blur(20px)" }}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#B8952A]/50 to-transparent" />
        <div className="max-w-[1320px] mx-auto px-6 lg:px-16 h-20 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3.5">
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="absolute inset-0 border border-[#B8952A] rotate-45" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-[#B8952A] rotate-45" />
              </div>
            </div>
            <div className="leading-none">
              <p className="text-[#1C1610] tracking-[0.28em] font-light" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px" }}>
                LODHA
              </p>
              <p className="text-[#B8952A] text-[7px] tracking-[0.5em] font-light mt-0.5">ADMIN PANEL</p>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="flex items-center gap-1">
            {(["All Properties", "+ New"] as const).map((label, i) => {
              const active = i === 0 ? view === "list" : view === "form" && !editingId;
              return (
                <button
                  key={label}
                  onClick={() =>
                    i === 0
                      ? goList()
                      : (setForm(EMPTY_FORM), setEditingId(null), setImagePreview(""), setView("form"))
                  }
                  className={`px-5 py-2 text-[9px] tracking-[0.4em] uppercase font-light transition-all duration-300 border-b-2
                    ${active ? "text-[#B8952A] border-[#B8952A]" : "text-[#1C1610]/40 border-transparent hover:text-[#1C1610]/70"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-5">
            <a href="/admin/bulk" className="hidden sm:block text-[#1C1610]/30 hover:text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300">
              Bulk Upload
            </a>
            <a href="/residences" target="_blank" className="hidden sm:block text-[#1C1610]/35 hover:text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300">
              Live ↗
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1320px] mx-auto px-6 lg:px-16 py-14">

        {/* ══════════════════════════════════════════════════════════
            FORM VIEW — Add / Edit
        ══════════════════════════════════════════════════════════ */}
        {view === "form" && (
          <div className="max-w-3xl">
            <button
              onClick={goList}
              className="flex items-center gap-2 text-[#1C1610]/30 hover:text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300 mb-8"
            >
              ← Back
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="w-5 h-px bg-[#B8952A]/60" />
              <span className="text-[#B8952A] text-[8px] tracking-[0.6em] uppercase font-light">
                {editingId ? "Edit Entry" : "New Entry"}
              </span>
            </div>
            <h1 className="text-[#1C1610] font-light mb-10" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(30px,5vw,50px)" }}>
              {editingId
                ? <>Edit <em className="text-[#1C1610]/30">Residence</em></>
                : <>Add <em className="text-[#1C1610]/30">Residence</em></>
              }
            </h1>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">

              {/* ── IMAGE UPLOAD SECTION ── */}
              <div className="border border-[#B8952A]/15 p-8" style={{ background: "rgba(245,237,224,0.5)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-4 h-px bg-[#B8952A]/50" />
                  <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light">Property Image</p>
                </div>

                <div className="flex gap-6 items-start">
                  {/* Image preview box */}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="relative flex-shrink-0 w-48 h-36 border-2 border-dashed border-[#B8952A]/25 hover:border-[#B8952A]/55 transition-all duration-300 overflow-hidden group"
                    style={{ background: imagePreview ? "transparent" : "rgba(184,149,42,0.03)" }}
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <p className="text-white text-[9px] tracking-[0.4em] uppercase font-light">Change</p>
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        {uploading ? (
                          <div className="flex gap-1">
                            {[0, 150, 300].map((d) => (
                              <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#B8952A] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                            ))}
                          </div>
                        ) : (
                          <>
                            <div className="w-8 h-8 border border-[#B8952A]/30 flex items-center justify-center">
                              <span className="text-[#B8952A]/60 text-lg">+</span>
                            </div>
                            <p className="text-[#1C1610]/30 text-[8px] tracking-[0.4em] uppercase font-light">Upload</p>
                          </>
                        )}
                      </div>
                    )}
                  </button>

                  {/* Right side */}
                  <div className="flex-1 flex flex-col gap-4">
                    <div>
                      <p className="text-[#1C1610]/50 text-[11px] font-light leading-relaxed">
                        Upload a property image. It uploads to Appwrite Storage and saves the file ID automatically.
                      </p>
                      <p className="text-[#1C1610]/30 text-[10px] font-light mt-1.5">
                        Recommended: 800×600px · JPG, PNG, WEBP · max 5MB
                      </p>
                      {/* Show the stored imageId for reference */}
                      {form.imageId && (
                        <p className="text-[#B8952A]/50 text-[9px] font-light mt-2 font-mono break-all">
                          ID: {form.imageId}
                        </p>
                      )}
                    </div>

                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }}
                    />

                    <div className="flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="px-5 py-2.5 text-[9px] tracking-[0.4em] uppercase font-light text-white disabled:opacity-50 transition-opacity"
                        style={{ background: "linear-gradient(90deg,#B8952A,#D4B96A)" }}
                      >
                        {uploading ? "Uploading…" : imagePreview ? "Replace Image" : "Choose File"}
                      </button>
                      {imagePreview && (
                        <button
                          type="button"
                          onClick={() => { setImagePreview(""); setForm((p) => ({ ...p, imageId: "" })); }}
                          className="px-5 py-2.5 text-[9px] tracking-[0.4em] uppercase font-light text-[#1C1610]/40 border border-[#1C1610]/12 hover:text-red-500 hover:border-red-300 transition-all duration-300"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── IDENTITY ── */}
              <div className="border border-[#B8952A]/12 p-8" style={{ background: "rgba(245,237,224,0.5)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-4 h-px bg-[#B8952A]/50" />
                  <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light">Identity</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <Field label="Project Name"          value={form.name}     onChange={f("name")}     placeholder="World One"                required />
                  <Field label="Location"              value={form.location} onChange={f("location")} placeholder="Worli Sea Face, Mumbai"    required />
                  <Field label="Configuration / Beds"  value={form.beds}     onChange={f("beds")}     placeholder="3–5 BHK"                   required />
                  <Field label="Floors"                value={form.floors}   onChange={f("floors")}   placeholder="117 Floors" />
                </div>
              </div>

              {/* ── PRICING ── */}
              <div className="border border-[#B8952A]/12 p-8" style={{ background: "rgba(245,237,224,0.5)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-4 h-px bg-[#B8952A]/50" />
                  <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light">Pricing</p>
                </div>
                <Field label="Starting Price" value={form.price} onChange={f("price")} placeholder="₹ 12 Cr+" />
              </div>

              {/* ── CLASSIFICATION ── */}
              <div className="border border-[#B8952A]/12 p-8" style={{ background: "rgba(245,237,224,0.5)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-4 h-px bg-[#B8952A]/50" />
                  <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light">Classification</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <SelectField label="Type"   value={form.type}   onChange={f("type")}   options={TYPE_OPTIONS} />
                  <SelectField label="Status" value={form.status} onChange={f("status")} options={STATUS_OPTIONS} />
                </div>
              </div>

              {/* ── CARD PREVIEW ── */}
              <div className="border border-[#B8952A]/20 overflow-hidden" style={{ background: "#FBF7F0" }}>
                <p className="text-[#1C1610]/25 text-[8px] tracking-[0.45em] uppercase font-light px-6 pt-5 pb-3">
                  Card Preview
                </p>
                <div className="flex gap-0">
                  <div className="w-28 flex-shrink-0 relative" style={{ background: "linear-gradient(160deg,#F0E8D5,#EDE3CC)" }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-[#B8952A]/20 text-[8px] tracking-[0.3em] uppercase font-light">No image</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-5 flex flex-col gap-3">
                    <div>
                      <p className="text-[#B8952A] text-[7px] tracking-[0.5em] uppercase font-light">{form.location || "Location"}</p>
                      <p className="text-[#1C1610]/80 font-light mt-1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px" }}>
                        {form.name || "Project Name"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-[#1C1610]/30 text-[7px] tracking-[0.4em] uppercase font-light">Starting</p>
                        <p className="text-[#1C1610]/70 font-light" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "16px" }}>
                          {form.price || "—"}
                        </p>
                      </div>
                      <div className="w-px h-8 bg-[#B8952A]/15" />
                      <div>
                        <p className="text-[#1C1610]/30 text-[7px] tracking-[0.4em] uppercase font-light">Config</p>
                        <p className="text-[#1C1610]/55 text-[11px] font-light">{form.beds || "—"}</p>
                      </div>
                      {form.status && (
                        <>
                          <div className="w-px h-8 bg-[#B8952A]/15" />
                          <span className={`text-[7px] tracking-[0.4em] uppercase font-light px-2.5 py-1 border ${statusStyle(form.status)}`}>
                            {form.status}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SUBMIT / CANCEL ── */}
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  disabled={saving || uploading}
                  className="relative px-10 py-4 overflow-hidden group disabled:opacity-50 transition-opacity"
                  style={{ background: "linear-gradient(90deg,#B8952A,#D4B96A,#B8952A)", backgroundSize: "200%", fontFamily: "'Montserrat', sans-serif" }}
                >
                  <span className="relative z-10 text-[9px] tracking-[0.45em] uppercase font-medium text-white">
                    {saving ? "Saving…" : editingId ? "Update Residence" : "Create Residence"}
                  </span>
                  <span className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                </button>
                <button
                  type="button"
                  onClick={goList}
                  className="px-8 py-4 text-[9px] tracking-[0.45em] uppercase font-light text-[#1C1610]/40 border border-[#1C1610]/12 hover:text-[#1C1610]/70 hover:border-[#1C1610]/25 transition-all duration-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            LIST VIEW
        ══════════════════════════════════════════════════════════ */}
        {view === "list" && (
          <>
            {/* Header */}
            <div className="flex items-end justify-between mb-10">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-5 h-px bg-[#B8952A]/60" />
                  <span className="text-[#B8952A] text-[8px] tracking-[0.6em] uppercase font-light">Database</span>
                </div>
                <h1 className="text-[#1C1610] font-light" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,4vw,44px)" }}>
                  All <em className="text-[#1C1610]/30">Properties</em>
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={fetchResidences}
                  className="text-[#1C1610]/30 hover:text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300"
                >
                  ↻ Refresh
                </button>
                <button
                  onClick={() => { setForm(EMPTY_FORM); setEditingId(null); setImagePreview(""); setView("form"); }}
                  className="px-7 py-3 text-[9px] tracking-[0.45em] uppercase font-medium text-white hover:opacity-85 transition-opacity"
                  style={{ background: "linear-gradient(90deg,#B8952A,#D4B96A)", fontFamily: "'Montserrat', sans-serif" }}
                >
                  + Add New
                </button>
              </div>
            </div>

            {/* Search + counts */}
            <div className="flex items-center gap-6 mb-6 flex-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or location…"
                className="flex-1 max-w-sm border border-[#B8952A]/15 bg-white/60 px-4 py-2.5 text-[#1C1610]/60 font-light outline-none focus:border-[#B8952A]/40 focus:bg-white transition-all duration-300 placeholder:text-[#1C1610]/20"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "14px" }}
              />
              <div className="ml-auto flex items-center gap-8">
                {[{ label: "Total", val: residences.length }, { label: "Shown", val: filtered.length }].map(({ label, val }) => (
                  <div key={label} className="text-right">
                    <p className="text-[#1C1610]/25 text-[7px] tracking-[0.45em] uppercase font-light">{label}</p>
                    <p className="text-[#B8952A] font-light" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px" }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Loading state */}
            {loading && (
              <div className="py-20 flex flex-col items-center gap-4">
                <div className="flex gap-1.5">
                  {[0, 150, 300].map((d) => (
                    <div key={d} className="w-1.5 h-1.5 rounded-full bg-[#B8952A] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
                <p className="text-[#1C1610]/25 text-[8px] tracking-[0.45em] uppercase font-light">Loading</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && filtered.length === 0 && (
              <div className="py-20 text-center border border-[#B8952A]/10">
                <p className="text-[#1C1610]/20 text-[9px] tracking-[0.5em] uppercase font-light">
                  {search ? "No matching properties" : "No residences added yet"}
                </p>
                {!search && (
                  <button
                    onClick={() => setView("form")}
                    className="mt-5 text-[#B8952A]/50 hover:text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300"
                  >
                    + Add first residence
                  </button>
                )}
              </div>
            )}

            {/* Cards grid */}
            {!loading && filtered.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((r) => (
                  <div
                    key={r.$id}
                    className="group border border-[#B8952A]/12 overflow-hidden hover:border-[#B8952A]/35 hover:shadow-[0_4px_24px_rgba(184,149,42,0.10)] transition-all duration-500"
                    style={{ background: "#FBF7F0" }}
                  >
                    {/* Image — resolveImage() converts imageId → full Appwrite URL ✅ */}
                    <div className="relative h-48 overflow-hidden" style={{ background: "linear-gradient(160deg,#F0E8D5,#EDE3CC)" }}>
                      {r.imageId ? (
                        <img
                          src={resolveImage(r.imageId)}
                          alt={r.name}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <svg viewBox="0 0 120 160" className="w-16 h-20 opacity-20" fill="none">
                            <rect x="40" y="30" width="40" height="130" fill="#B8952A" />
                            {Array.from({ length: 10 }).map((_, i) =>
                              Array.from({ length: 4 }).map((_, j) => (
                                <rect key={`${i}-${j}`} x={44 + j * 9} y={36 + i * 13} width="6" height="9"
                                  fill={(i + j) % 3 === 0 ? "#B8952A" : "transparent"} opacity="0.6" />
                              ))
                            )}
                          </svg>
                          <p className="text-[#B8952A]/30 text-[8px] tracking-[0.4em] uppercase font-light">No Image</p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#EDE3CC]/60 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className={`text-[7px] tracking-[0.4em] uppercase font-light px-2.5 py-1 border ${statusStyle(r.status)}`}>
                          {r.status}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="text-[#1C1610]/30 text-[7px] tracking-[0.3em] uppercase font-light bg-white/60 px-2 py-1">
                          {r.floors}
                        </span>
                      </div>
                    </div>

                    {/* Card info */}
                    <div className="p-5">
                      <p className="text-[#B8952A] text-[7px] tracking-[0.5em] uppercase font-light">{r.location}</p>
                      <p className="text-[#1C1610]/80 font-light mt-1.5 mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px" }}>
                        {r.name}
                      </p>
                      <div className="h-px bg-gradient-to-r from-[#B8952A]/20 to-transparent mb-3" />
                      <div className="flex justify-between items-end mb-4">
                        <div>
                          <p className="text-[#1C1610]/30 text-[7px] tracking-[0.4em] uppercase font-light">Starting</p>
                          <p className="text-[#1C1610]/70 font-light mt-0.5" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "17px" }}>
                            {r.price}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#1C1610]/30 text-[7px] tracking-[0.4em] uppercase font-light">Config</p>
                          <p className="text-[#1C1610]/55 text-[10px] font-light mt-0.5">{r.beds}</p>
                        </div>
                      </div>

                      {/* Edit / Delete buttons */}
                      <div className="flex items-center gap-3 pt-3 border-t border-[#B8952A]/[0.08]">
                        <button
                          onClick={() => handleEdit(r)}
                          className="flex-1 py-2 text-[9px] tracking-[0.4em] uppercase font-light text-[#B8952A] border border-[#B8952A]/25 hover:bg-[#B8952A] hover:text-white transition-all duration-300"
                        >
                          Edit
                        </button>

                        {deleteConfirm === r.$id ? (
                          <div className="flex-1 flex items-center justify-center gap-2 py-2 border border-red-300/40 bg-red-50">
                            <button
                              onClick={() => handleDelete(r.$id, r.imageId)}
                              disabled={!!deleting}
                              className="text-red-600 text-[9px] tracking-[0.35em] uppercase font-light hover:text-red-700 disabled:opacity-40"
                            >
                              {deleting === r.$id ? "…" : "Confirm"}
                            </button>
                            <span className="text-red-300 text-[8px]">/</span>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-[#1C1610]/40 text-[9px] tracking-[0.35em] uppercase font-light hover:text-[#1C1610]/70"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(r.$id)}
                            className="flex-1 py-2 text-[9px] tracking-[0.4em] uppercase font-light text-[#1C1610]/30 border border-[#1C1610]/10 hover:text-red-500 hover:border-red-300/40 transition-all duration-300"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="w-5 h-px bg-[#B8952A]/30" />
              <p className="text-[#1C1610]/25 text-[8px] tracking-[0.4em] uppercase font-light">
                {residences.length} {residences.length === 1 ? "property" : "properties"} · changes reflect live on /residences
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}