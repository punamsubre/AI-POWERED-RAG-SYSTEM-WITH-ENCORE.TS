import { api } from "encore.dev/api";
import { secret } from "encore.dev/config";
import { VertexAI } from "@google-cloud/vertexai";

// Infrastructure configuration via Encore Secrets
const UseVertexAI = secret("GOOGLE_GENAI_USE_VERTEXAI");
const ProjectID = secret("GOOGLE_CLOUD_PROJECT");
const LocationID = secret("GOOGLE_CLOUD_LOCATION");

const useVertexAI = UseVertexAI() === "True";
const project = ProjectID();
const location = LocationID() || "us-central1";

export interface EmbeddingResponse {
    vector: number[];
}

export interface CompletionResponse {
    answer: string;
}

// Initialize Vertex AI
const vertexAI = useVertexAI && project ? new VertexAI({ project, location }) : null;
const generativeModel = vertexAI?.getGenerativeModel({
    model: "gemini-2.5-flash",
});

const embeddingModelName = "text-embedding-004";

// createEmbedding calls Vertex AI REST API to generate a vector for the given text.
export const createEmbedding = api(
    { expose: false, method: "POST", path: "/embedding" },
    async (params: { text: string }): Promise<EmbeddingResponse> => {
        if (!generativeModel) {
            return { vector: new Array(768).fill(0) };
        }

        try {
            // Retrieve authentication token
            const tokenResult: any = await (generativeModel as any).fetchToken();
            const token = typeof tokenResult === "string" ? tokenResult : tokenResult.token;

            // Call the Vertex AI prediction API
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${embeddingModelName}:predict`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    instances: [{ content: params.text }]
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Vertex AI error: ${response.status} ${errText}`);
            }

            const data: any = await response.json();
            return { vector: data.predictions[0].embeddings.values };
        } catch (err: any) {
            console.error("Embedding generation failed:", err);
            return { vector: new Array(768).fill(0) };
        }
    }
);

// generateAnswer calls Gemini to generate an answer based on context and question.
export const generateAnswer = api(
    { expose: false, method: "POST", path: "/generate" },
    async (params: { question: string; context: string }): Promise<CompletionResponse> => {
        if (!generativeModel) {
            return { answer: "Error: Vertex AI not configured correctly." };
        }

        try {
            const prompt = `
        You are a helpful company assistant. Use the following context to answer the question.
        If the answer is not in the context, say you don't know based on the provided documents.
        
        Context:
        ${params.context}
        
        Question: ${params.question}
        
        Answer:
      `;

            const result = await generativeModel.generateContent(prompt);
            const response = await result.response;

            if (!response.candidates || response.candidates.length === 0) {
                throw new Error("No response candidates returned");
            }

            const text = response.candidates[0].content.parts[0].text || "No text found.";
            return { answer: text };
        } catch (err: any) {
            console.error("Generation failed:", err);
            return { answer: `Error generating response: ${err.message || "Unknown error"}` };
        }
    }
);
