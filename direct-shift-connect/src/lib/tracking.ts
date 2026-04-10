import { useEffect } from "react";

// UTM parameter capture
export function useTracking() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
    const utmData: Record<string, string> = {};
    utmKeys.forEach((key) => {
      const val = params.get(key);
      if (val) utmData[key] = val;
    });
    if (Object.keys(utmData).length > 0) {
      sessionStorage.setItem("utm_params", JSON.stringify(utmData));
    }

    // Scroll depth tracking
    let maxScroll = 0;
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
      );
      if (scrollPercent > maxScroll) {
        maxScroll = scrollPercent;
        if ([25, 50, 75, 100].includes(maxScroll)) {
          trackEvent("scroll_depth", { depth: maxScroll });
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Time on page
    const startTime = Date.now();
    const handleUnload = () => {
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      trackEvent("time_on_page", { seconds: timeSpent });
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  // GA4
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
  // Facebook Pixel
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("trackCustom", eventName, params);
  }
  // TikTok Pixel
  if (typeof window !== "undefined" && (window as any).ttq) {
    (window as any).ttq.track(eventName, params);
  }
}

export function trackAppDownload(store: "ios" | "android") {
  trackEvent("app_download_click", { store });
  // Also fire standard conversion events
  if ((window as any).fbq) (window as any).fbq("track", "Lead", { content_name: store });
  if ((window as any).ttq) (window as any).ttq.track("ClickButton", { content_name: `download_${store}` });
}

export function trackLearnMore() {
  trackEvent("learn_more_click");
}
