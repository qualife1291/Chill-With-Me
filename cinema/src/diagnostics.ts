// Local QA retains frame evidence; production avoids per-frame DOM serialization.
// Explicit ?diagnostics=0/1 allows testing both paths without another build.
const value = new URLSearchParams(location.search).get("diagnostics");
export const sceneDiagnostics =
  value === "1" ||
  (value !== "0" && ["localhost", "127.0.0.1"].includes(location.hostname));
