import { Storage } from "@google-cloud/storage";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let pdf: any;
try {
    pdf = require("pdf-parse");
} catch (e) {
    console.error("Failed to require pdf-parse:", e);
}

const storage = new Storage();

export interface GcsFileInput {
    bucket: string;
    blob: string;
}

export interface ParsedDocument {
    text: string;
    filename: string;
}

export interface ChunkResult {
    documentId: string;
    chunksProcessed: number;
}

// Activity 1: Read PDF bytes from Google Cloud Storage
export async function readPdfFromGcs(input: GcsFileInput): Promise<Buffer> {
    const [content] = await storage.bucket(input.bucket).file(input.blob).download();
    console.log(`Downloaded ${input.blob} from gs://${input.bucket} (${content.length} bytes)`);
    return Buffer.from(content);
}

// Activity 2: Parse PDF bytes and extract text
export async function parsePdf(fileBytes: Buffer): Promise<string> {
    const buffer = Buffer.from(fileBytes);
    const parseFunc = typeof pdf === "function" ? pdf : (pdf?.default || pdf?.PDFParse || pdf);

    if (typeof parseFunc !== "function") {
        throw new Error("pdf-parse module not available");
    }

    let result: any;
    try {
        const parser = new (parseFunc as any)({ data: buffer });
        await parser.load();
        result = await parser.getText();
    } catch {
        result = await (parseFunc as any)(buffer);
    }

    const text = result?.text || "";
    console.log(`Extracted ${text.length} characters from PDF`);
    return text;
}

// Activity 3: Store document record via Encore Upload API
export async function storeDocument(input: { filename: string; text: string; encoreBaseUrl: string }): Promise<string> {
    const base64Content = Buffer.from(input.text).toString("base64");

    const response = await fetch(`${input.encoreBaseUrl}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            filename: input.filename,
            content: base64Content,
        }),
    });

    if (!response.ok) {
        throw new Error(`Upload API failed: ${response.status} ${await response.text()}`);
    }

    const data: any = await response.json();
    console.log(`Document stored with ID: ${data.id}`);
    return data.id;
}

// Activity 4: Generate embeddings for text chunks via Encore Embedding API
export async function generateEmbeddings(input: { documentId: string; text: string; encoreBaseUrl: string }): Promise<ChunkResult> {
    // Split text into chunks with overlap
    const maxSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];

    // First try paragraphs
    let paragraphs = input.text.split(/\n\s*\n/).filter(c => c.trim().length > 0);

    if (paragraphs.length <= 1 || paragraphs.some(c => c.length > 2000)) {
        let start = 0;
        while (start < input.text.length) {
            const end = start + maxSize;
            chunks.push(input.text.substring(start, end));
            start = end - overlap;
            if (start >= input.text.length) break;
        }
    } else {
        chunks.push(...paragraphs);
    }

    console.log(`Processing ${chunks.length} chunks for document ${input.documentId}`);

    for (const chunkText of chunks) {
        const response = await fetch(`${input.encoreBaseUrl}/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                documentId: input.documentId,
                text: chunkText,
            }),
        });

        if (!response.ok) {
            throw new Error(`Embedding API failed: ${response.status} ${await response.text()}`);
        }
    }

    return { documentId: input.documentId, chunksProcessed: chunks.length };
}
