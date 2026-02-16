import { useEffect } from "react";

interface DocumentMetaOptions {
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

/**
 * Hook to dynamically update document title and meta tags for SEO
 * Compatible with React 19 (no external dependencies needed)
 *
 * @param options - Meta tag options
 */
export function useDocumentMeta(options: DocumentMetaOptions) {
  useEffect(() => {
    const {
      title,
      description,
      ogTitle,
      ogDescription,
      ogImage,
    } = options;

    // Update document title
    if (title) {
      document.title = title;
    }

    // Update meta description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement("meta");
        metaDescription.setAttribute("name", "description");
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
    }

    // Update Open Graph title
    if (ogTitle) {
      let ogTitleMeta = document.querySelector('meta[property="og:title"]');
      if (!ogTitleMeta) {
        ogTitleMeta = document.createElement("meta");
        ogTitleMeta.setAttribute("property", "og:title");
        document.head.appendChild(ogTitleMeta);
      }
      ogTitleMeta.setAttribute("content", ogTitle);
    }

    // Update Open Graph description
    if (ogDescription) {
      let ogDescMeta = document.querySelector('meta[property="og:description"]');
      if (!ogDescMeta) {
        ogDescMeta = document.createElement("meta");
        ogDescMeta.setAttribute("property", "og:description");
        document.head.appendChild(ogDescMeta);
      }
      ogDescMeta.setAttribute("content", ogDescription);
    }

    // Update Open Graph image
    if (ogImage) {
      let ogImageMeta = document.querySelector('meta[property="og:image"]');
      if (!ogImageMeta) {
        ogImageMeta = document.createElement("meta");
        ogImageMeta.setAttribute("property", "og:image");
        document.head.appendChild(ogImageMeta);
      }
      ogImageMeta.setAttribute("content", ogImage);
    }

    // Update Twitter Card title
    if (ogTitle) {
      let twitterTitleMeta = document.querySelector('meta[name="twitter:title"]');
      if (!twitterTitleMeta) {
        twitterTitleMeta = document.createElement("meta");
        twitterTitleMeta.setAttribute("name", "twitter:title");
        document.head.appendChild(twitterTitleMeta);
      }
      twitterTitleMeta.setAttribute("content", ogTitle);
    }

    // Update Twitter Card description
    if (ogDescription) {
      let twitterDescMeta = document.querySelector('meta[name="twitter:description"]');
      if (!twitterDescMeta) {
        twitterDescMeta = document.createElement("meta");
        twitterDescMeta.setAttribute("name", "twitter:description");
        document.head.appendChild(twitterDescMeta);
      }
      twitterDescMeta.setAttribute("content", ogDescription);
    }

    // Update Twitter Card image
    if (ogImage) {
      let twitterImageMeta = document.querySelector('meta[name="twitter:image"]');
      if (!twitterImageMeta) {
        twitterImageMeta = document.createElement("meta");
        twitterImageMeta.setAttribute("name", "twitter:image");
        document.head.appendChild(twitterImageMeta);
      }
      twitterImageMeta.setAttribute("content", ogImage);
    }
  }, [options.title, options.description, options.ogTitle, options.ogDescription, options.ogImage]);
}
