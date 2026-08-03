import type { MetadataRoute } from "next";
import { CHAIN_ORDER, CHAINS } from "@/lib/chains/registry";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${base}/settings`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${base}/pro`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${base}/forensics`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    },
    {
      url: `${base}/btc/forensics`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.7,
    },
  ];

  const chains = CHAIN_ORDER.flatMap((id) => {
    const slug = CHAINS[id].slug;
    return [
      {
        url: `${base}/${slug}`,
        lastModified: now,
        changeFrequency: "hourly" as const,
        priority: 0.9,
      },
      {
        url: `${base}/${slug}/pro`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.4,
      },
    ];
  });

  return [...staticRoutes, ...chains];
}
