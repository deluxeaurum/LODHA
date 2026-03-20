// lib/config.ts
export const config = {
  endpoint:              process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!,
  projectId:             process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!,
  databaseId:            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  residenceCollectionId: process.env.NEXT_PUBLIC_APPWRITE_RESIDENCE_COLLECTION_ID!,
  residenceBucketId:     process.env.NEXT_PUBLIC_APPWRITE_RESIDENCE_BUCKET_ID!,
} as const;