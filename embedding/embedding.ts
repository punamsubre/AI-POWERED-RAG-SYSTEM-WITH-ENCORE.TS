import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { ai } from "~encore/clients";

export const DB = new SQLDatabase("embedding", {
    migrations: "./migrations",
});

export interface CreateEmbeddingParams {
    documentId: string;
    text: string;
}

// create handles the creation of embeddings for a document chunk.
// Exposed for Temporal workflow to call via HTTP.
export const create = api(
    { expose: true, method: "POST", path: "/create" },
    async (params: CreateEmbeddingParams): Promise<{ success: boolean }> => {
        const resp = await ai.createEmbedding({ text: params.text });
        const vectorStr = `[${resp.vector.join(",")}]`;

        await DB.exec`
            INSERT INTO chunks (document_id, content, embedding)
            VALUES (${params.documentId}, ${params.text}, ${vectorStr})
        `;
        return { success: true };
    }
);
