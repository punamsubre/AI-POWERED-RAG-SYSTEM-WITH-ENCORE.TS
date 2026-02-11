import { api } from "encore.dev/api";
import { Client, Connection } from "@temporalio/client";
import { processDocument, resolveErrorSignal, updateBucketDetails } from "./workflows";

export interface TriggerParams {
    bucket: string;
    blob: string;
}

export interface TriggerResponse {
    workflowId: string;
    status: string;
}

// trigger starts a Temporal workflow to process a new document from GCS
export const trigger = api(
    { expose: true, method: "POST", path: "/trigger" },
    async (params: TriggerParams): Promise<TriggerResponse> => {
        const connection = await Connection.connect({ address: "localhost:7233" });
        const client = new Client({ connection });

        const workflowId = `process-doc-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const encoreBaseUrl = "http://localhost:4000";

        const handle = await client.workflow.start(processDocument, {
            taskQueue: "document-processing",
            workflowId,
            args: [{
                bucket: params.bucket,
                blob: params.blob,
                encoreBaseUrl,
            }],
        });

        return {
            workflowId: handle.workflowId,
            status: "workflow_started",
        };
    }
);

// workflowStatus checks the status of a running Temporal workflow
export const workflowStatus = api(
    { expose: true, method: "GET", path: "/workflow-status" },
    async (params: { workflowId: string }): Promise<{ status: string; result?: any }> => {
        const connection = await Connection.connect({ address: "localhost:7233" });
        const client = new Client({ connection });

        const handle = client.workflow.getHandle(params.workflowId);
        const desc = await handle.describe();

        let result: any = null;
        if (desc.status.name === "COMPLETED") {
            result = await handle.result();
        }

        return {
            status: desc.status.name,
            result,
        };
    }
);

// resolve sends a signal to a stuck workflow to retry after error resolution
export const resolve = api(
    { expose: true, method: "POST", path: "/resolve" },
    async (params: { workflowId: string }): Promise<{ status: string }> => {
        const connection = await Connection.connect({ address: "localhost:7233" });
        const client = new Client({ connection });

        const handle = client.workflow.getHandle(params.workflowId);
        await handle.signal(resolveErrorSignal);

        return { status: "signal_sent" };
    }
);

// updateWorkflow sends corrected bucket/blob details to a stuck workflow
export const updateWorkflow = api(
    { expose: true, method: "POST", path: "/update-workflow" },
    async (params: { workflowId: string; bucket: string; blob: string }): Promise<{ status: string; updatedDetails: any }> => {
        const connection = await Connection.connect({ address: "localhost:7233" });
        const client = new Client({ connection });

        const handle = client.workflow.getHandle(params.workflowId);
        const result = await handle.executeUpdate(updateBucketDetails, {
            args: [{ bucket: params.bucket, blob: params.blob }],
        });

        return { status: "update_sent", updatedDetails: result };
    }
);
