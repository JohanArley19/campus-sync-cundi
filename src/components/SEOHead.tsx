import { useEffect } from "react";

const DEFAULTS = {
  title: "Sistema Académico — Universidad de Cundinamarca",
  description:
    "Sistema web inteligente para la gestión y priorización de actividades académicas con apoyo de inteligencia artificial.",
  url: typeof window !== "undefined" ? window.location.origin : "",
  type: "website",
};

interface SEOHeadProps {
  title?: string;
  description?: string;
  url?: string;
  type?: string;
}

function setMeta(property: string, content: string, isName = false) {
  const attr = isName ? "name" : "property";
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function SEOHead({
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  url = DEFAULTS.url,
  type = DEFAULTS.type,
}: SEOHeadProps) {
  useEffect(() => {
    document.title = title;
    setMeta("og:type", type);
    setMeta("og:url", url);
    setMeta("og:title", title);
    setMeta("og:description", description);
    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:title", title, true);
    setMeta("twitter:description", description, true);
    setMeta("description", description, true);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", url);
  }, [title, description, url, type]);

  return null;
}
