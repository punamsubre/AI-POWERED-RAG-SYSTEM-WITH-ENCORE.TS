import { api } from "encore.dev/api";

export interface PingResponse {
    message: string;
}

// Ping is a simple API to verify the service is running.
export const ping = api(
    { expose: true, method: "GET", path: "/ping" },
    async (): Promise<PingResponse> => {
        return { message: "AI service is up and running!" };
    }
);
