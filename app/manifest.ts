import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MailMind",
    short_name: "MailMind",
    description: "AI-first universal email client",
    start_url: "/inbox",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0b0b12",
    orientation: "portrait-primary",
    categories: ["productivity", "communication"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
