import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
    // Ensure tracing resolves to repo root when building from the frontend subfolder
    outputFileTracingRoot: path.join(__dirname, ".."),
};

export default nextConfig;
