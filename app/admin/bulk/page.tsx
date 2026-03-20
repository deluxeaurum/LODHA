"use client";

import { useState, useRef } from "react";
import { databases, storage } from "@/lib/appwrite";
import { ID } from "appwrite";
import { config } from "@/lib/config";

/* ══════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════ */
interface ResidenceRow {
  name:     string;
  location: string;
  type:     string;
  beds:     string;
  price:    string;
  status:   string;
  floors:   string;
  imageUrl: string; // from CSV — will be downloaded & uploaded to Appwrite storage
}

type RowStatus = "pending" | "downloading" | "uploading" | "saving" | "success" | "error";

interface RowState {
  row:    ResidenceRow;
  status: RowStatus;
  error?: string;
}

/* ══════════════════════════════════════════════════════════
   SAMPLE CSV
   NOTE: area & order columns are accepted in CSV for reference
   but are NOT saved to Appwrite (not in schema)
══════════════════════════════════════════════════════════ */
const SAMPLE_CSV = `name,location,type,beds,price,area,status,floors,order,imageUrl
World One,Worli Sea Face Mumbai,Ultra Luxury,3-5 BHK,₹ 12 Cr+,2800-6200 sq.ft,Ready to Move,117 Floors,1,https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80
Lodha Malabar,Malabar Hill Mumbai,Ultra Luxury,4-6 BHK,₹ 25 Cr+,4200-9000 sq.ft,Accepting Expressions,42 Floors,2,https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80
Lodha Park,Lower Parel Mumbai,Premium,2-4 BHK,₹ 8.5 Cr+,1850-3600 sq.ft,Limited Units,68 Floors,3,https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80
Lodha Altamount,Altamount Road Mumbai,Ultra Luxury,4-5 BHK,₹ 30 Cr+,5500-8200 sq.ft,Sold Out,38 Floors,4,https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=80
New Cuffe Parade,Wadala Mumbai,Premium,2-4 BHK,₹ 4.5 Cr+,1200-2800 sq.ft,Ready to Move,58 Floors,5,https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80
Palava Lakeshore,Palava City Dombivli,New Launch,1-3 BHK,₹ 75 L+,650-1450 sq.ft,New Launch,32 Floors,6,https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80
Lincoln Square,Holborn London,Premium,1-3 Bed,£ 1.8M+,850-2200 sq.ft,Enquire Now,26 Floors,7,https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=800&q=80
Lodha Belmondo,Pune Mumbai Expressway,Premium,3-5 BHK,₹ 3.2 Cr+,2100-4400 sq.ft,Ready to Move,Villas & High-rise,8,https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80
Lodha Azzuro,Koregaon Park Pune,Premium,2-3 BHK,₹ 1.8 Cr+,1100-1800 sq.ft,Ready to Move,24 Floors,9,https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80
Lodha Meridian,HITECH City Hyderabad,Premium,2-4 BHK,₹ 2.5 Cr+,1300-2600 sq.ft,Ready to Move,36 Floors,10,https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80
125 Greenwich,Lower Manhattan New York,Ultra Luxury,1-4 Bed,$ 2.5M+,900-4500 sq.ft,Enquire Now,88 Floors,11,https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80
Lodha DAMAC Hills,DAMAC Hills Dubai,Ultra Luxury,3-6 BHK,AED 4.5M+,3000-8000 sq.ft,Accepting Expressions,52 Floors,12,https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80`;

const REQUIRED_COLUMNS = ["name", "location", "type", "beds"];
const ALL_COLUMNS      = ["name", "location", "type", "beds", "price", "area", "status", "floors", "order", "imageUrl"];

/* ══════════════════════════════════════════════════════════
   CSV PARSER
══════════════════════════════════════════════════════════ */
function parseCSV(text: string): ResidenceRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: ResidenceRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted values that may contain commas
    const values: string[] = [];
    let current  = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"')            { inQuotes = !inQuotes; }
      else if (char === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else                               { current += char; }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });

    if (row.name && row.location && row.type && row.beds) {
      rows.push({
        name:     row.name     || "",
        location: row.location || "",
        type:     row.type     || "Premium",
        beds:     row.beds     || "",
        price:    row.price    || "",
        status:   row.status   || "Ready to Move",
        floors:   row.floors   || "",
        imageUrl: row.imageurl || row.imageUrl || "", // handle both casings
        // NOTE: area & order are parsed but not stored in this object
        //       because they don't exist in the Appwrite collection schema
      });
    }
  }
  return rows;
}

/* ══════════════════════════════════════════════════════════
   IMAGE HELPER
   Downloads an image from a URL and uploads it to
   Appwrite Storage → returns the Appwrite file $id
   This $id is then saved as "imageId" in the document
══════════════════════════════════════════════════════════ */
async function uploadImageFromUrl(imageUrl: string): Promise<string> {
  // If no URL provided, return empty string (no image)
  if (!imageUrl.trim()) return "";

  // Step 1: Fetch the image from the external URL
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error(`Failed to fetch image: ${response.status}`);

  // Step 2: Convert to Blob
  const blob = await response.blob();

  // Step 3: Determine file extension from content-type
  const contentType = blob.type || "image/jpeg";
  const ext = contentType.split("/")[1]?.split("+")[0] || "jpg";

  // Step 4: Create a File object (Appwrite SDK needs a File, not a Blob)
  const file = new File([blob], `residence-${Date.now()}.${ext}`, { type: contentType });

  // Step 5: Upload to Appwrite Storage bucket
  const uploaded = await storage.createFile(
    config.residenceBucketId, // your RESIDENCE bucket ID from .env.local
    ID.unique(),               // auto-generate unique file ID
    file
  );

  // Step 6: Return the Appwrite file $id — this becomes imageId in the document
  return uploaded.$id;
}

/* ══════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════ */
export default function BulkUploadPage() {
  const [rows,       setRows]       = useState<RowState[]>([]);
  const [uploading,  setUploading]  = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [done,       setDone]       = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── Parse CSV file ── */
  const handleFile = (file: File) => {
    setParseError(null);
    setRows([]);
    setDone(false);
    setProgress(0);

    if (!file.name.endsWith(".csv")) {
      setParseError("Please upload a .csv file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        setParseError("No valid rows found. Make sure columns name, location, type, beds are present.");
        return;
      }
      setRows(parsed.map((row) => ({ row, status: "pending" })));
    };
    reader.readAsText(file);
  };

  /* ── Drag & drop handlers ── */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  /* ── Main upload flow ──
     For each row:
       1. If imageUrl exists → download image → upload to Appwrite Storage → get imageId
       2. Create Appwrite document with all schema fields + the imageId
  ── */
  const handleUpload = async () => {
    if (rows.length === 0) return;
    setUploading(true);
    setDone(false);
    setProgress(0);

    for (let i = 0; i < rows.length; i++) {
      const { name, location, type, beds, price, floors, status, imageUrl } = rows[i].row;

      try {
        /* ── Step A: Download & upload image to Appwrite Storage ── */
        let imageId = "";

        if (imageUrl.trim()) {
          // Show "downloading" status while fetching the image
          setRows((prev) =>
            prev.map((r, idx) => idx === i ? { ...r, status: "downloading" } : r)
          );
          imageId = await uploadImageFromUrl(imageUrl);
        }

        /* ── Step B: Save document to Appwrite Database ── */
        setRows((prev) =>
          prev.map((r, idx) => idx === i ? { ...r, status: "saving" } : r)
        );

        await databases.createDocument(
          config.databaseId,
          config.residenceCollectionId,
          ID.unique(),
          {
            name,
            location,
            type,
            beds,
            price,
            floors,
            status,
            imageId, // ✅ this is now the real Appwrite Storage file $id
            // ❌ area  — not in Appwrite schema, not sent
            // ❌ order — not in Appwrite schema, not sent
          }
        );

        setRows((prev) =>
          prev.map((r, idx) => idx === i ? { ...r, status: "success" } : r)
        );
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: message } : r
          )
        );
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
      // Small delay between rows to avoid Appwrite rate limits
      await new Promise((res) => setTimeout(res, 150));
    }

    setUploading(false);
    setDone(true);
  };

  /* ── Download sample CSV ── */
  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "lodha-residences-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Computed counts ── */
  const successCount     = rows.filter((r) => r.status === "success").length;
  const errorCount       = rows.filter((r) => r.status === "error").length;
  const hasImageRows     = rows.filter((r) => r.row.imageUrl.trim()).length;

  /* ── Status label helper ── */
  const statusLabel = (s: RowStatus) => {
    if (s === "downloading") return "Downloading image…";
    if (s === "uploading")   return "Uploading to storage…";
    if (s === "saving")      return "Saving to database…";
    return "";
  };

  /* ══════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen" style={{ background: "#FAF6EF", fontFamily: "'Montserrat', sans-serif" }}>

      {/* Subtle gold grid background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(184,149,42,1) 1px,transparent 1px),linear-gradient(90deg,rgba(184,149,42,1) 1px,transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

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
              <p
                className="text-[#1C1610] tracking-[0.28em] font-light"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px" }}
              >
                LODHA
              </p>
              <p className="text-[#B8952A] text-[7px] tracking-[0.5em] font-light mt-0.5">
                BULK UPLOAD
              </p>
            </div>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-6">
            <a
              href="/admin/residences/new"
              className="text-[#1C1610]/35 hover:text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300"
            >
              ← Single Add
            </a>
            <a
              href="/residences"
              target="_blank"
              className="text-[#1C1610]/35 hover:text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300"
            >
              Live ↗
            </a>
          </div>
        </div>
      </div>

      {/* ══ PAGE CONTENT ══ */}
      <div className="max-w-[1320px] mx-auto px-6 lg:px-16 py-14">

        {/* Page header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-5 h-px bg-[#B8952A]/60" />
            <span className="text-[#B8952A] text-[8px] tracking-[0.6em] uppercase font-light">
              Bulk Import
            </span>
          </div>
          <h1
            className="text-[#1C1610] font-light"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,4vw,48px)" }}
          >
            Upload <em className="text-[#1C1610]/30">Multiple Properties</em>
          </h1>
          <p className="text-[#1C1610]/40 font-light mt-3 max-w-xl text-sm leading-relaxed">
            Upload a CSV with up to 50 properties. Images are automatically downloaded from
            the URL you provide and uploaded to Appwrite Storage — each residence gets a real
            <code className="text-[#B8952A] mx-1">imageId</code>stored in the database.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-10">

          {/* ══ LEFT — Drop zone + Preview table ══ */}
          <div className="flex flex-col gap-6">

            {/* Drop zone */}
            {rows.length === 0 && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center py-20 px-8 text-center
                  ${dragOver
                    ? "border-[#B8952A]/60 bg-[#B8952A]/[0.05]"
                    : "border-[#B8952A]/20 hover:border-[#B8952A]/45 hover:bg-[#B8952A]/[0.02]"
                  }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />

                {/* Upload icon */}
                <div
                  className="w-14 h-14 border border-[#B8952A]/25 flex items-center justify-center mb-5"
                  style={{ background: "rgba(184,149,42,0.04)" }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 15V3M12 3L8 7M12 3L16 7" stroke="#B8952A" strokeWidth="1.2" strokeLinecap="round" />
                    <path
                      d="M3 15V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V15"
                      stroke="#B8952A" strokeWidth="1.2" strokeLinecap="round" opacity="0.4"
                    />
                  </svg>
                </div>

                <p
                  className="text-[#1C1610]/60 font-light mb-1"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px" }}
                >
                  {dragOver ? "Drop your CSV here" : "Drag & drop your CSV file"}
                </p>
                <p className="text-[#1C1610]/30 text-[10px] tracking-wide font-light">
                  or click to browse
                </p>

                {parseError && (
                  <div className="mt-5 px-5 py-3 border border-red-300/40 bg-red-50">
                    <p className="text-red-600 text-[10px] font-light tracking-wide">{parseError}</p>
                  </div>
                )}
              </div>
            )}

            {/* Preview + upload table */}
            {rows.length > 0 && (
              <div>

                {/* Table header bar */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <p className="text-[#1C1610]/60 text-sm font-light">
                      <span
                        className="text-[#B8952A] font-medium"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px" }}
                      >
                        {rows.length}
                      </span>{" "}
                      properties ready
                    </p>
                    {hasImageRows > 0 && (
                      <span className="text-[#1C1610]/30 text-[9px] tracking-[0.3em] uppercase font-light">
                        · {hasImageRows} with images
                      </span>
                    )}
                    {done && (
                      <div className="flex items-center gap-3 text-[9px] tracking-[0.3em] uppercase font-light">
                        <span className="text-emerald-600">{successCount} uploaded</span>
                        {errorCount > 0 && <span className="text-red-500">{errorCount} failed</span>}
                      </div>
                    )}
                  </div>

                  {!uploading && (
                    <button
                      onClick={() => { setRows([]); setDone(false); setProgress(0); }}
                      className="text-[#1C1610]/30 hover:text-[#1C1610]/60 text-[9px] tracking-[0.4em] uppercase font-light transition-colors duration-300"
                    >
                      ✕ Clear
                    </button>
                  )}
                </div>

                {/* Progress bar */}
                {(uploading || done) && (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[#1C1610]/35 text-[9px] tracking-[0.4em] uppercase font-light">
                        {done ? "Complete" : `Uploading… ${progress}%`}
                      </p>
                      <p className="text-[#1C1610]/35 text-[9px] font-light">
                        {successCount} / {rows.length}
                      </p>
                    </div>
                    <div className="h-1 bg-[#B8952A]/10 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          background: "linear-gradient(90deg,#B8952A,#D4B96A)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Data table */}
                <div className="border border-[#B8952A]/12 overflow-hidden">
                  {/* Head */}
                  <div
                    className="grid grid-cols-[32px_2fr_2fr_1fr_1fr_100px] border-b border-[#B8952A]/10"
                    style={{ background: "rgba(184,149,42,0.04)" }}
                  >
                    {["", "Name", "Location", "Type", "Price", "Image / Status"].map((h, i) => (
                      <div key={i} className="px-4 py-3">
                        <p className="text-[#1C1610]/25 text-[8px] tracking-[0.4em] uppercase font-light">{h}</p>
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  <div className="max-h-[520px] overflow-y-auto">
                    {rows.map((r, i) => (
                      <div
                        key={i}
                        className={`grid grid-cols-[32px_2fr_2fr_1fr_1fr_100px] border-b border-[#B8952A]/[0.06] last:border-0 transition-colors duration-300
                          ${r.status === "success"     ? "bg-emerald-50/60"     : ""}
                          ${r.status === "error"       ? "bg-red-50/60"         : ""}
                          ${r.status === "downloading" || r.status === "uploading" || r.status === "saving"
                            ? "bg-[#B8952A]/[0.04]" : ""}
                        `}
                      >
                        {/* Row number / status icon */}
                        <div className="px-3 py-3.5 flex items-center justify-center">
                          {r.status === "pending" && (
                            <span className="text-[#1C1610]/20 text-[9px] font-light">{i + 1}</span>
                          )}
                          {(r.status === "downloading" || r.status === "uploading" || r.status === "saving") && (
                            <div className="w-3 h-3 border border-[#B8952A] border-t-transparent rounded-full animate-spin" />
                          )}
                          {r.status === "success" && (
                            <span className="text-emerald-500 text-[13px]">✓</span>
                          )}
                          {r.status === "error" && (
                            <span className="text-red-500 text-[13px]" title={r.error}>✕</span>
                          )}
                        </div>

                        {/* Name */}
                        <div className="px-4 py-3.5 flex items-center">
                          <p
                            className="text-[#1C1610]/70 font-light truncate"
                            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "14px" }}
                          >
                            {r.row.name}
                          </p>
                        </div>

                        {/* Location */}
                        <div className="px-4 py-3.5 flex items-center">
                          <p className="text-[#1C1610]/35 text-[10px] font-light truncate">
                            {r.row.location}
                          </p>
                        </div>

                        {/* Type */}
                        <div className="px-4 py-3.5 flex items-center">
                          <p className="text-[#B8952A]/60 text-[8px] tracking-[0.3em] uppercase font-light">
                            {r.row.type}
                          </p>
                        </div>

                        {/* Price */}
                        <div className="px-4 py-3.5 flex items-center">
                          <p
                            className="text-[#1C1610]/50 font-light"
                            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "13px" }}
                          >
                            {r.row.price || "—"}
                          </p>
                        </div>

                        {/* Image indicator / in-progress label / error */}
                        <div className="px-4 py-3.5 flex items-center">
                          {r.status === "error" && (
                            <p className="text-red-500 text-[8px] font-light leading-tight">
                              {r.error?.slice(0, 30)}
                            </p>
                          )}
                          {(r.status === "downloading" || r.status === "uploading" || r.status === "saving") && (
                            <p className="text-[#B8952A] text-[7px] tracking-[0.2em] font-light leading-tight">
                              {statusLabel(r.status)}
                            </p>
                          )}
                          {r.status === "pending" && r.row.imageUrl && (
                            <p className="text-[#1C1610]/20 text-[8px] font-light">img ✓</p>
                          )}
                          {r.status === "pending" && !r.row.imageUrl && (
                            <p className="text-[#1C1610]/15 text-[8px] font-light">no img</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload button */}
                {!done && (
                  <div className="mt-6">
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="relative px-10 py-4 overflow-hidden group disabled:opacity-60 transition-opacity"
                      style={{
                        background: "linear-gradient(90deg,#B8952A,#D4B96A,#B8952A)",
                        backgroundSize: "200%",
                        fontFamily: "'Montserrat', sans-serif",
                      }}
                    >
                      <span className="relative z-10 text-[9px] tracking-[0.45em] uppercase font-medium text-white">
                        {uploading
                          ? `Uploading ${progress}%…`
                          : `Upload All ${rows.length} Properties`}
                      </span>
                      <span className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                    </button>
                    {hasImageRows > 0 && (
                      <p className="text-[#1C1610]/25 text-[9px] font-light mt-3 leading-relaxed">
                        {hasImageRows} images will be downloaded from their URLs and uploaded to
                        Appwrite Storage automatically.
                      </p>
                    )}
                  </div>
                )}

                {/* Done state */}
                {done && (
                  <div className="mt-6 flex items-center gap-4 flex-wrap">
                    <div className="border border-emerald-400/30 bg-emerald-50 px-5 py-3 flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <p className="text-emerald-700 text-[10px] tracking-[0.35em] uppercase font-light">
                        {successCount} of {rows.length} uploaded successfully
                      </p>
                    </div>
                    {errorCount > 0 && (
                      <div className="border border-red-300/30 bg-red-50 px-5 py-3 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <p className="text-red-600 text-[10px] tracking-[0.35em] uppercase font-light">
                          {errorCount} failed — check error column above
                        </p>
                      </div>
                    )}
                    <a
                      href="/residences"
                      target="_blank"
                      className="text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light hover:opacity-70 transition-opacity"
                    >
                      View Live →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ══ RIGHT — Sidebar instructions ══ */}
          <div className="flex flex-col gap-6">

            {/* Step 1 */}
            <div className="border border-[#B8952A]/15 p-6" style={{ background: "rgba(245,237,224,0.5)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-px bg-[#B8952A]/50" />
                <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light">Step 1</p>
              </div>
              <p className="text-[#1C1610]/65 font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>
                Download the template
              </p>
              <p className="text-[#1C1610]/35 text-[11px] font-light leading-relaxed mb-4">
                Use our sample CSV as a starting point. Fill in your property data row by row.
              </p>
              <button
                onClick={downloadSample}
                className="flex items-center gap-3 text-[#B8952A] text-[9px] tracking-[0.4em] uppercase font-light border border-[#B8952A]/25 px-5 py-2.5 hover:bg-[#B8952A]/5 transition-colors duration-300"
              >
                ↓ Download Sample CSV
              </button>
            </div>

            {/* Step 2 — Column guide */}
            <div className="border border-[#B8952A]/12 p-6" style={{ background: "rgba(245,237,224,0.5)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-px bg-[#B8952A]/50" />
                <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light">Step 2</p>
              </div>
              <p className="text-[#1C1610]/65 font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>
                Fill in your data
              </p>
              <div className="flex flex-col gap-2">
                {ALL_COLUMNS.map((col) => (
                  <div key={col} className="flex items-center gap-3">
                    <div
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        REQUIRED_COLUMNS.includes(col) ? "bg-[#B8952A]" : "bg-[#1C1610]/15"
                      }`}
                    />
                    <p className="text-[#1C1610]/55 text-[10px] font-light tracking-wide">{col}</p>
                    {REQUIRED_COLUMNS.includes(col) && (
                      <span className="text-[#B8952A]/60 text-[8px] tracking-[0.3em] uppercase font-light ml-auto">
                        required
                      </span>
                    )}
                    {col === "imageUrl" && (
                      <span className="text-[#1C1610]/25 text-[8px] font-light ml-auto">
                        → imageId
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-[#B8952A]/10">
                <p className="text-[#1C1610]/30 text-[9px] font-light leading-relaxed">
                  Gold = required. Grey = optional.
                  <br />
                  <span className="text-[#B8952A]/50">imageUrl</span> is auto-uploaded to
                  Appwrite Storage and saved as <span className="text-[#B8952A]/50">imageId</span>.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="border border-[#B8952A]/12 p-6" style={{ background: "rgba(245,237,224,0.5)" }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-px bg-[#B8952A]/50" />
                <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light">Step 3</p>
              </div>
              <p className="text-[#1C1610]/65 font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}>
                Upload & publish
              </p>
              <p className="text-[#1C1610]/35 text-[11px] font-light leading-relaxed">
                Drop your CSV in the zone. Preview the data, then click Upload. Images download
                automatically and each property goes live on{" "}
                <span className="text-[#B8952A]">/residences</span> instantly.
              </p>
            </div>

            {/* Valid values */}
            <div className="border border-[#B8952A]/12 p-6" style={{ background: "rgba(245,237,224,0.5)" }}>
              <p className="text-[#B8952A] text-[8px] tracking-[0.55em] uppercase font-light mb-4">
                Valid Values
              </p>
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-[#1C1610]/40 text-[9px] tracking-[0.4em] uppercase font-light mb-2">type</p>
                  {["Ultra Luxury", "Premium", "New Launch"].map((v) => (
                    <p key={v} className="text-[#1C1610]/55 text-[10px] font-light py-0.5">· {v}</p>
                  ))}
                </div>
                <div className="h-px bg-[#B8952A]/10" />
                <div>
                  <p className="text-[#1C1610]/40 text-[9px] tracking-[0.4em] uppercase font-light mb-2">status</p>
                  {["Ready to Move", "Accepting Expressions", "Limited Units", "Sold Out", "New Launch", "Enquire Now"].map((v) => (
                    <p key={v} className="text-[#1C1610]/55 text-[10px] font-light py-0.5">· {v}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}