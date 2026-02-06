import { Subscription } from "encore.dev/pubsub";
import { create } from "./embedding";
import { DocumentsTopic } from "../upload/upload";

// Subscribe to document upload events.
const _ = new Subscription(DocumentsTopic, "process-embeddings", {
    handler: async (event) => {
        // Split text into chunks (naive approach for demo)
        // First try splitting by paragraphs
        let chunks = event.text.split(/\n\s*\n/).filter(c => c.trim().length > 0);

        // If chunks are too large or we got only one big chunk, split by sentence or character count
        if (chunks.length <= 1 || chunks.some(c => c.length > 2000)) {
            const result: string[] = [];
            const maxSize = 1000;
            const overlap = 200;

            let start = 0;
            while (start < event.text.length) {
                let end = start + maxSize;
                result.push(event.text.substring(start, end));
                start = end - overlap;
                if (start >= event.text.length) break;
            }
            chunks = result;
        }

        for (const chunkText of chunks) {
            await create({
                documentId: event.id,
                text: chunkText,
            });
        }
    },
});
