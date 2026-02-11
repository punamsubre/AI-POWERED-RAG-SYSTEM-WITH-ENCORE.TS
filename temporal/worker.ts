import { NativeConnection, Worker, bundleWorkflowCode } from "@temporalio/worker";
import * as activities from "./activities";
import * as url from "url";
import * as path from "path";

const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

async function run() {
    const connection = await NativeConnection.connect({ address: "localhost:7233" });

    // Bundle workflows for ESM compatibility
    const workflowBundle = await bundleWorkflowCode({
        workflowsPath: path.resolve(__dirname, "./workflows.ts"),
    });

    const worker = await Worker.create({
        connection,
        namespace: "default",
        taskQueue: "document-processing",
        workflowBundle,
        activities,
    });

    console.log("Temporal Worker started on 'document-processing' task queue");
    await worker.run();
}

run().catch((err) => {
    console.error("Worker failed:", err);
    process.exit(1);
});
