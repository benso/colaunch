import { Pinecone } from "@pinecone-database/pinecone";

let pineconeClient: Pinecone | undefined;

export function getPineconeClient() {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing PINECONE_API_KEY environment variable");
  }

  pineconeClient = new Pinecone({ apiKey });

  return pineconeClient;
}

export function getPineconeIndex() {
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!indexName) {
    throw new Error("Missing PINECONE_INDEX_NAME environment variable");
  }

  return getPineconeClient().index(indexName);
}
