import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import AppStoreButtons from "@/components/AppStoreButtons";
import { trackLearnMore, trackAppDownload } from "@/lib/tracking";
import statdoctorLogo from "@/assets/statdoctor-logo.svg";

const APP_STORE_URL = "https://linktr.ee/statdoctorau";

export default function FinalCTA() {
  return (
    <section className="py-20 md:py-28 bg-card">
      <div className="container text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <img src={statdoctorLogo} alt="StatDoctor" className="h-8 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Start Locuming <span className="text-sd-blue italic">Smarter</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Join 200+ doctors already finding shifts without agencies.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
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
          <AppStoreButtons className="justify-center" />
        </motion.div>
      </div>
      <footer className="text-center mt-16 text-xs text-muted-foreground">
        © {new Date().getFullYear()} StatDoctor. All rights reserved.
      </footer>
    </section>
  );
}
