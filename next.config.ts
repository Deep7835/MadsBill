import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * A production build writes over the same .next directory a running dev
   * server reads from, which yanks its chunks out from under the browser
   * ("Cannot find module './331.js'", surfacing as an [object Event]
   * unhandled rejection). `npm run build:check` sets this to a scratch
   * directory so a verification build can never disturb `npm run dev`.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
