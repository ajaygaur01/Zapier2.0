"use client";
// CI/CD Test Change

import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Toaster } from "react-hot-toast";
import { useNotifications } from "../hooks/usenotification";
import { useAuth } from "../context/AuthContext";  // your existing auth hook
import { AuthProvider } from "../context/AuthContext";

import {
  HeroSection,
  SocialProofSection,
  ProblemSection,
  HowItWorksSection,
  FeatureSection,
  BuilderPreviewSection,
  IntegrationsSection,
  TestimonialsSection,
  PricingPreviewSection,
  FinalCTASection,
  LandingFooter,
} from "@/components/landing";

function HomeContent() {
  const { user } = useAuth();
  useNotifications(user ? String(user.id) : "");

  return (
    <MarketingLayout>
      <Toaster position="top-right" />
      <main>
        <HeroSection />
        <SocialProofSection />
        <ProblemSection />
        <HowItWorksSection />
        <FeatureSection />
        <BuilderPreviewSection />
        <IntegrationsSection />
        <TestimonialsSection />
        <PricingPreviewSection />
        <FinalCTASection />
        <LandingFooter />
      </main>
    </MarketingLayout>
  );
}

export default function Home() {
  return (
    <AuthProvider>
      <HomeContent />
    </AuthProvider>
  );
}
