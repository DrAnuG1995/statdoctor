import { motion } from "framer-motion";
import { Download, UserPlus, Search, Send, ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";

import phoneMap from "@/assets/phone-map.png";
import phoneAnalytics from "@/assets/phone-analytics.png";
import phoneVerification from "@/assets/phone-verification.png";
import phoneBrowseList from "@/assets/phone-browse-list.png";
import phoneBrowseGrid from "@/assets/phone-browse-grid.png";
import phoneHospital from "@/assets/phone-hospital.png";
import phoneReviews from "@/assets/phone-reviews.png";
import phoneCalendar from "@/assets/phone-calendar.png";
import phoneNotifications from "@/assets/phone-notifications.png";
import phoneMapEast from "@/assets/phone-map-east.png";

const steps = [
  { icon: Download, step: "01", title: "Download the app" },
  { icon: UserPlus, step: "02", title: "Create a free account" },
  { icon: Search, step: "03", title: "Browse shifts" },
  { icon: Send, step: "04", title: "Apply directly" },
];

const screenshots = [
  { src: phoneBrowseList, alt: "Browse shifts in list view" },
  { src: phoneBrowseGrid, alt: "Browse shifts in grid view" },
  { src: phoneMap, alt: "Map view of available shifts across Australia" },
  { src: phoneHospital, alt: "Hospital details and overview" },
  { src: phoneReviews, alt: "Hospital reviews and ratings" },
  { src: phoneCalendar, alt: "Shift calendar view" },
  { src: phoneVerification, alt: "Document verification screen" },
  { src: phoneNotifications, alt: "Notifications and updates" },
  { src: phoneAnalytics, alt: "Personal analytics dashboard" },
];

export default function HowItWorks() {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", slidesToScroll: 1 },
    [Autoplay({ delay: 3000, stopOnInteraction: true })]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12"
        >
          How StatDoctor <span className="text-sd-blue italic">Works</span>
        </motion.h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sd-blue/20 flex items-center justify-center">
                <s.icon className="w-7 h-7 text-sd-blue" />
              </div>
              <span className="text-xs font-bold text-sd-blue uppercase tracking-widest">{s.step}</span>
              <p className="font-semibold mt-1">{s.title}</p>
            </motion.div>
          ))}
        </div>

        {/* Phone Screenshots Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-14 max-w-4xl mx-auto relative"
        >
          <div ref={emblaRef} className="overflow-hidden">
            <div className="flex">
              {screenshots.map((shot, i) => (
                <div
                  key={i}
                  className="flex-[0_0_55%] min-w-0 sm:flex-[0_0_35%] md:flex-[0_0_25%] px-2 md:px-3"
                >
                  <div
                    className={`transition-all duration-300 rounded-[2rem] overflow-hidden shadow-lg border-[3px] border-foreground/10 ${
                      selectedIndex === i ? "scale-105 shadow-2xl" : "scale-95 opacity-70"
                    }`}
                  >
                    <img
                      src={shot.src}
                      alt={shot.alt}
                      className="w-full h-auto"
                      loading="lazy"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Buttons */}
          <button
            onClick={scrollPrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 md:-translate-x-6 w-10 h-10 rounded-full bg-card shadow-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Previous screenshot"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 md:translate-x-6 w-10 h-10 rounded-full bg-card shadow-md border border-border flex items-center justify-center hover:bg-accent transition-colors"
            aria-label="Next screenshot"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>

          {/* Dots */}
          <div className="flex justify-center gap-1.5 mt-6">
            {screenshots.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  selectedIndex === i ? "bg-sd-blue w-5" : "bg-muted-foreground/30"
                }`}
                aria-label={`Go to screenshot ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
