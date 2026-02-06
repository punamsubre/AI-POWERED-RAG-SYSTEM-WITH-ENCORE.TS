import { api } from "encore.dev/api";
import { SQLDatabase } from "encore.dev/storage/sqldb";
import { Topic } from "encore.dev/pubsub";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let pdf: any;
try {
    pdf = require("pdf-parse");
} catch (e) {
    console.error("Failed to require pdf-parse:", e);
}

export interface DocumentEvent {
    id: string;
    text: string;
}

// DocumentsTopic is the topic where document events are published.
export const DocumentsTopic = new Topic<DocumentEvent>("documents", {
    deliveryGuarantee: "at-least-once",
});

// Define the database for the upload service.
export const DB = new SQLDatabase("upload", {
    migrations: "./migrations",
});

export interface UploadResponse {
    id: string;
    filename: string;
    status: string;
}

export interface FileUploadParams {
    filename: string;
    content: string; // Base64 encoded content
}

// upload handles binary file uploads (e.g. PDFs).
// It extracts text from the file before storing it.
export const upload = api(
    { expose: true, method: "POST", path: "/upload" },
    async (params: FileUploadParams): Promise<UploadResponse> => {
        const id = Math.random().toString(36).substring(7);
        let text = "";

        const buffer = Buffer.from(params.content, "base64");

        if (params.filename.endsWith(".pdf")) {
            try {
                // pdf-parse handling for various export styles and ESM
                const parseFunc = typeof pdf === "function" ? pdf : (pdf?.default || pdf?.PDFParse || pdf);

                if (typeof parseFunc !== "function") {
                    throw new Error(`pdf-parse module did not export a function or class. Type: ${typeof parseFunc}`);
                }

                let result: any;
                try {
                    // Try the modern class-based approach first
                    const parser = new (parseFunc as any)({ data: buffer });
                    await parser.load();
                    result = await parser.getText();
                } catch (err: any) {
                    // Fallback to direct function call (older pdf-parse versions)
                    result = await (parseFunc as any)(buffer);
                }

                text = result?.text || "";
            } catch (err: any) {
                console.error("PDF extraction failed:", err);
                text = "[Error extracting text from PDF]";
            }
        } else {
            // Assume plain text for other files
            text = buffer.toString("utf-8");
        }

        // Final safety check to ensure text is a valid string
        if (!text) {
            text = "";
        }

        // Store in DB
        await DB.exec`
            INSERT INTO documents (id, filename, content)
            VALUES (${id}, ${params.filename}, ${text})
        `;

        // Publish event for background processing
        await DocumentsTopic.publish({ id, text });

        return { id, filename: params.filename, status: "uploaded" };
    }
);
