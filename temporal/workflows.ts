import {
    proxyActivities,
    defineSignal,
    defineUpdate,
    setHandler,
    condition,
} from "@temporalio/workflow";
import type * as activities from "./activities";

const {
    readPdfFromGcs,
    parsePdf,
    storeDocument,
    generateEmbeddings,
} = proxyActivities<typeof activities>({
    startToCloseTimeout: "10 minutes",
    retry: {
        initialInterval: "3s",
        backoffCoefficient: 2,
        maximumInterval: "15s",
        // maximumAttempts: 3,
    },
});

export const resolveErrorSignal = defineSignal("resolveError");

export const updateBucketDetails = defineUpdate<
    { bucket: string; blob: string },
    [{ bucket: string; blob: string }]
>("updateBucketDetails");

export interface WorkflowInput {
    bucket: string;
    blob: string;
    encoreBaseUrl: string;
}

// ProcessDocument orchestrates the full RAG ingestion pipeline.
// Supports error recovery: if GCS read fails, workflow pauses and waits
// for a human to send corrected details via Update or a retry Signal.
export async function processDocument(input: WorkflowInput): Promise<{
    documentId: string;
    chunksProcessed: number;
    status: string;
}> {
    let currentBucket = input.bucket;
    let currentBlob = input.blob;
    let isResolved = false;

    // Signal handler: simple retry with same params
    setHandler(resolveErrorSignal, () => {
        isResolved = true;
    });

    // Update handler: fix params and retry
    setHandler(updateBucketDetails, (newDetails) => {
        currentBucket = newDetails.bucket;
        currentBlob = newDetails.blob;
        isResolved = true;
        return { bucket: currentBucket, blob: currentBlob };
    });

    // Step 1: Download PDF from GCS (with error recovery)
    let fileBytes: Buffer;
    while (true) {
        try {
            fileBytes = await readPdfFromGcs({ bucket: currentBucket, blob: currentBlob });
            break; // Success, move to step 2
        } catch (err) {
            // All retries exhausted — pause and wait for human intervention
            isResolved = false;
            await condition(() => isResolved);
            // Human has either sent a signal (retry same) or update (new params)
        }
    }

    // Step 2: Extract text from PDF
    const text = await parsePdf(fileBytes);

    if (!text || text.trim().length === 0) {
        return { documentId: "", chunksProcessed: 0, status: "empty_document" };
    }

    // Step 3: Store document record via Encore Upload API
    const documentId = await storeDocument({
        filename: currentBlob,
        text,
        encoreBaseUrl: input.encoreBaseUrl,
    });

    // Step 4: Generate embeddings via Encore Embedding API
    const result = await generateEmbeddings({
        documentId,
        text,
        encoreBaseUrl: input.encoreBaseUrl,
    });

    return {
        documentId: result.documentId,
        chunksProcessed: result.chunksProcessed,
        status: "completed",
    };
}
