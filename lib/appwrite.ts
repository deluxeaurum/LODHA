// lib/appwrite.ts
import { Client, Account, Databases, Storage } from "appwrite";
import { config } from "@/lib/config";

const client = new Client()
  .setEndpoint(config.endpoint)   // https://cloud.appwrite.io/v1
  .setProject(config.projectId);

export const account   = new Account(client);
export const databases = new Databases(client);
export const storage   = new Storage(client);
export const DATABASE_ID = config.databaseId;
export const RESIDENCES_COLLECTION_ID = config.residenceCollectionId;
export const RESIDENCES_BUCKET_ID = config.residenceBucketId;