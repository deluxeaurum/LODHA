// services/residenceService.ts
import { databases, storage } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { config } from "@/lib/config";

/* ─────────────────────────────────────────────
   FIELD SETS — match Appwrite collection exactly
   ✅ "order" added — exists in Appwrite collection
───────────────────────────────────────────── */
const RESIDENCE_FIELDS = [
  "$id", "$createdAt", "$updatedAt",
  "name", "location", "type",
  "beds", "price", "floors",
  "status", "imageId", "order",  // ✅ order added
];

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */
export interface Residence {
  $id:         string;
  name:        string;
  location:    string;
  type:        string;
  beds:        string;
  price:       string;
  floors:      string;
  status:      string;
  imageId:     string;
  order:       number;   // ✅ order added
  $createdAt?: string;
  $updatedAt?: string;
}

export type CreateResidenceInput = {
  name:     string;
  location: string;
  type:     string;
  beds:     string;
  price:    string;
  floors:   string;
  status:   string;
  imageId?: string;
  order?:   number;   // ✅ order added — optional so old code still works
};

export type UpdateResidenceInput = Partial<CreateResidenceInput>;

/* ─────────────────────────────────────────────
   SERVICE
───────────────────────────────────────────── */
export class ResidenceService {

  /* ── READ ── */

  async getAllResidences(): Promise<Residence[]> {
    const res = await databases.listDocuments(
      config.databaseId,
      config.residenceCollectionId,
      [Query.select(RESIDENCE_FIELDS), Query.limit(100), Query.orderAsc("order")]  // ✅ sorted by order
    );
    return res.documents as unknown as Residence[];
  }

  async getResidenceById(id: string): Promise<Residence | null> {
    if (!id) return null;
    // ✅ FIX: positional args, not object
    const doc = await databases.getDocument(
      config.databaseId,
      config.residenceCollectionId,
      id
    );
    return doc as unknown as Residence;
  }

  async listResidences({
    type,
    status,
    searchQuery,
    limit  = 20,
    offset = 0,
  }: {
    type?:        string;
    status?:      string;
    searchQuery?: string;
    limit?:       number;
    offset?:      number;
  } = {}): Promise<Residence[]> {
    const queries: string[] = [Query.select(RESIDENCE_FIELDS)];

    if (type)        queries.push(Query.equal("type", type));
    if (status)      queries.push(Query.equal("status", status));
    if (searchQuery) queries.push(Query.search("name", searchQuery));

    queries.push(Query.orderAsc("order"));  // ✅ sorted by order
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));

    const res = await databases.listDocuments(
      config.databaseId,
      config.residenceCollectionId,
      queries
    );
    return res.documents as unknown as Residence[];
  }

  /* ── CREATE ── */

  async createResidence(
    data: Omit<CreateResidenceInput, "imageId">,
    imageFile?: File
  ): Promise<Residence> {
    let imageId = "";

    if (imageFile) {
      const uploaded = await storage.createFile(
        config.residenceBucketId,
        ID.unique(),
        imageFile
      );
      imageId = uploaded.$id;
    }

    const doc = await databases.createDocument(
      config.databaseId,
      config.residenceCollectionId,
      ID.unique(),
      {
        name:     data.name,
        location: data.location,
        type:     data.type,
        beds:     data.beds,
        price:    data.price,
        floors:   data.floors,
        status:   data.status,
        order:    data.order ?? 0,   // ✅ order saved, defaults to 0
        imageId,
      }
    );

    return doc as unknown as Residence;
  }

  /* ── UPDATE ── */

  async updateResidence(
    id: string,
    updates: UpdateResidenceInput,
    newImageFile?: File,
    oldImageId?: string   // ✅ FIX: separate param for old image to delete
  ): Promise<Residence> {
    const processed: Record<string, unknown> = { ...updates };

    if (newImageFile) {
      // ✅ FIX: delete old image using oldImageId param, not updates.imageId
      if (oldImageId) {
        await storage.deleteFile(config.residenceBucketId, oldImageId);
      }
      const uploaded = await storage.createFile(
        config.residenceBucketId,
        ID.unique(),
        newImageFile
      );
      processed.imageId = uploaded.$id;
    }

    const doc = await databases.updateDocument(
      config.databaseId,
      config.residenceCollectionId,
      id,
      processed
    );

    return doc as unknown as Residence;
  }

  /* ── DELETE ── */

  async deleteResidence(id: string, imageId?: string): Promise<boolean> {
    if (imageId) {
      await storage.deleteFile(config.residenceBucketId, imageId);
    }
    await databases.deleteDocument(
      config.databaseId,
      config.residenceCollectionId,
      id
    );
    return true;
  }

  /* ── IMAGE HELPERS ── */

  getImageUrl(imageId: string): string {
    return `${config.endpoint}/storage/buckets/${config.residenceBucketId}/files/${imageId}/view?project=${config.projectId}`;
  }

  getImagePreview(imageId: string, width = 600, height = 800): string {
    return `${config.endpoint}/storage/buckets/${config.residenceBucketId}/files/${imageId}/preview?width=${width}&height=${height}&project=${config.projectId}`;
  }

  async uploadImage(file: File): Promise<string> {
    const uploaded = await storage.createFile(
      config.residenceBucketId,
      ID.unique(),
      file
    );
    return uploaded.$id;
  }

  async deleteImage(imageId: string): Promise<boolean> {
    await storage.deleteFile(config.residenceBucketId, imageId);
    return true;
  }
}

export const residenceService = new ResidenceService();