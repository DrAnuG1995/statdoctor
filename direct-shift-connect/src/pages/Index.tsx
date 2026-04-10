import HeroSection from "@/components/HeroSection";
import ValueSection from "@/components/ValueSection";
import CommunitySection from "@/components/CommunitySection";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import TrustSection from "@/components/TrustSection";
import FinalCTA from "@/components/FinalCTA";
import { useTracking } from "@/lib/tracking";

const Index = () => {
  useTracking();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <ValueSection />
      <CommunitySection />
      <ProblemSection />
      <HowItWorks />
      <TrustSection />
      <FinalCTA />
    </div>
  );
};

export default Index;
