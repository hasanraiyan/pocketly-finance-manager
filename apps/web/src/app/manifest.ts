import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pocketly — Personal Finance",
    short_name: "Pocketly",
    description: "Personal finance, kept like a ledger.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf6ed",
    theme_color: "#193b24",
    icons: [
      {
        src: "/pocketly-icon.png",
        sizes: "192x192 512x512",
        type: "image/png",
      },
    ],
  };
}
