// services/residenceService.ts
import { databases, storage } from "@/lib/appwrite";
import { ID, Query } from "appwrite";
import { config } from "@/lib/config";

/* ─────────────────────────────────────────────
   FIELD SETS — match Appwrite collection exactly
───────────────────────────────────────────── */
const RESIDENCE_FIELDS = [
  "$id", "$createdAt", "$updatedAt",
  "name", "location", "type",
  "beds", "price", "floors",
  "status", "imageId",
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
      [Query.select(RESIDENCE_FIELDS), Query.limit(100)]
    );
    return res.documents as unknown as Residence[];
  }

  async getResidenceById(id: string): Promise<Residence | null> {
    if (!id) return null;
    const doc = await databases.getDocument({
      databaseId: config.databaseId,
      collectionId: config.residenceCollectionId,
      documentId: id,
    });
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
        imageId,
      }
    );

    return doc as unknown as Residence;
  }

  /* ── UPDATE ── */

  async updateResidence(
    id: string,
    updates: UpdateResidenceInput,
    newImageFile?: File
  ): Promise<Residence> {
    const processed: Record<string, unknown> = { ...updates };

    if (newImageFile) {
      if (updates.imageId) {
        await storage.deleteFile(config.residenceBucketId, updates.imageId);
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