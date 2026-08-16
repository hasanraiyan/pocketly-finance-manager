import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Signed-in app shell and auth flows -- nothing there is useful to
      // index, and some (reset-password) carry single-use tokens in the URL.
      disallow: [
        "/dashboard",
        "/accounts",
        "/records",
        "/analysis",
        "/planning",
        "/settings",
        "/mcp-connect",
        "/mcp-guide",
        "/reset-password",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
