import { api } from "encore.dev/api";
import { ai } from "~encore/clients";

export interface StatusResponse {
    query_service: string;
    ai_service: string;
}

// Status checks the health of the query service and its dependencies (like the AI service).
export const status = api(
    { expose: true, method: "GET", path: "/status" },
    async (): Promise<StatusResponse> => {
        const aiResp = await ai.ping();
        return {
            query_service: "Query service is healthy!",
            ai_service: aiResp.message,
        };
    }
);
