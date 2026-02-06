import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { ai } from "~encore/clients";

// we can aslo define sql database
export const DB = new SQLDatabase("embedding", {
    migrations: "./migrations",
});

export interface CreateEmbeddingParams {
    documentId: string;
    text: string;
}

// createEmbedding handles the creation of embeddings for a document chunk.
export const create = api(
    { expose: false, method: "POST", path: "/create" },
    async (params: CreateEmbeddingParams): Promise<{ success: boolean }> => {
        // 1. Get real embedding from AI service
        const resp = await ai.createEmbedding({ text: params.text });
        const vectorStr = `[${resp.vector.join(",")}]`;

        // 2. Store in DB with real vector
        await DB.exec`
            INSERT INTO chunks (document_id, content, embedding)
            VALUES (${params.documentId}, ${params.text}, ${vectorStr})
        `;
        return { success: true };
    }
);
