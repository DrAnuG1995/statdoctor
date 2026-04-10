import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AppStoreButtons from "@/components/AppStoreButtons";
import { trackLearnMore, trackAppDownload } from "@/lib/tracking";
import statdoctorLogo from "@/assets/statdoctor-logo.svg";
import mobileScreen from "@/assets/mobile-screen.png";

const APP_STORE_URL = "https://linktr.ee/statdoctorau";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-6 pb-12 md:pt-10 md:pb-20">
      <div className="container">
        {/* Nav */}
        <nav className="flex items-center justify-between mb-10 md:mb-16">
          <img src={statdoctorLogo} alt="StatDoctor logo" className="h-8 md:h-10" />
          <a href="https://stan.store/statdoctor" target="_blank" rel="noopener noreferrer">
            <Button className="bg-foreground text-background hover:bg-foreground/90 text-lg font-bold px-6 py-5 rounded-full">Locum Bible</Button>
          </a>
          <div className="hidden md:flex items-center gap-3">
            <a href="https://statdoctor.app/" target="_blank" rel="noopener noreferrer" onClick={trackLearnMore}>
              <Button variant="heroOutline" size="sm">Learn More</Button>
            </a>
            <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackAppDownload("ios")}>
              <Button variant="hero" size="sm">Download App</Button>
            </a>
          </div>
        </nav>

        {/* Hero content */}
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-5">
              Find Locum Shifts{" "}
              <span className="text-sd-blue italic">Without Agencies</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-lg">
              StatDoctor connects doctors directly with hospitals.
              <br />
              Simple, transparent locum work.
            </p>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" onClick={() => trackAppDownload("ios")}>
                <Button variant="hero" size="lg" className="text-base px-8 py-6">
                  Download the App
                </Button>
              </a>
              <a href="https://statdoctor.app/" target="_blank" rel="noopener noreferrer" onClick={trackLearnMore}>
                <Button variant="heroOutline" size="lg" className="text-base px-8 py-6">
                  Learn More →
                </Button>
              </a>
            </div>
            <AppStoreButtons />
            <p className="mt-4 text-sm text-muted-foreground">Join 200+ doctors across Australia</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="flex justify-center"
          >
            <img
            src={mobileScreen}
              alt="StatDoctor mobile app showing locum shifts across Australia"
              className="w-64 md:w-80 drop-shadow-2xl rounded-3xl"
              loading="eager"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
