import { api } from "encore.dev/api";
import { ai } from "~encore/clients";
import { DB } from "../embedding/embedding";

export interface AskResponse {
    answer: string;
}

// ask handles user questions by searching for relevant context and calling the AI service.
export const ask = api(
    { expose: true, method: "GET", path: "/ask" },
    async (params: { q: string }): Promise<AskResponse> => {
        // Get embedding for the user's question
        const queryEmb = await ai.createEmbedding({ text: params.q });

        // Search for similar document chunks using vector similarity
        const vectorStr = `[${queryEmb.vector.join(",")}]`;
        const relevantChunks = await DB.query`
            SELECT content 
            FROM chunks
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT 5
        `;

        let context = "";
        for await (const row of relevantChunks) {
            context += row.content + "\n\n";
        }

        // Generate final answer based on the retrieved context
        const result = await ai.generateAnswer({
            question: params.q,
            context: context,
        });

        return { answer: result.answer };
    }
);
