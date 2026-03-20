import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/* ===============================
   CLASSNAME MERGER
=============================== */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ===============================
   IMAGE RESOLVER
=============================== */
const PLACEHOLDER = "/placeholder-watch.jpg";

const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID!;

export function resolveImage(fileId?: string) {
  if (!fileId) return PLACEHOLDER;

  // If already a full URL
  if (fileId.startsWith("http")) return fileId;

  // Use the preview endpoint instead of view
  return `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID}`;

}
