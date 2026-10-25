import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

import slide1Img from "@/assets/images/onboarding_slide_one_1786135219713.jpg";
import slide2Img from "@/assets/images/onboarding_slide_two_1786135234046.jpg";
import slide3Img from "@/assets/images/onboarding_slide_three_1786135246672.jpg";

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  image: string;
}

export function Welcome() {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: OnboardingSlide[] = [
    {
      id: 1,
      title: "Welcome to PayClick",
      description: "Manage your finances effortlessly with PayClick's seamless and secure payment system.",
      image: slide1Img
    },
    {
      id: 2,
      title: "Instant Top-ups & Data",
      description: "Enjoy cheap SME data bundles, instant airtime recharges, cable TV subscriptions, and zero service fees.",
      image: slide2Img
    },
    {
      id: 3,
      title: "Cashback & P-Coins Rewards",
      description: "Earn instant cashback rewards and trade P-Coins for real money or fee-free transaction multipliers.",
      image: slide3Img
    }
  ];

  const handleNext = () => {
    if (currentSlide === slides.length - 1) {
      localStorage.setItem("vtu_has_visited_before", "true");
      navigate("/login");
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem("vtu_has_visited_before", "true");
    navigate("/login");
  };

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex flex-col justify-between max-w-md mx-auto relative overflow-hidden select-none font-sans">
      {/* Top Floating Skip Button */}
      <div className="absolute top-5 right-5 z-30">
        <button 
          onClick={handleSkip}
          className="text-xs font-bold text-white bg-black/40 hover:bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm border border-white/20"
        >
          Skip
        </button>
      </div>

      {/* Slide Image Area - Matches Parent */}
      <div className="flex-1 relative w-full overflow-hidden min-h-[340px] sm:min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full h-full absolute inset-0 flex items-center justify-center"
          >
            <img 
              src={slide.image} 
              alt={slide.title}
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Curved Bottom Container */}
      <div className="relative w-full z-20 mt-auto">
        {/* Arch Curved Top SVG shape */}
        <div className="w-full overflow-hidden leading-none -mb-1">
          <svg 
            viewBox="0 0 500 80" 
            preserveAspectRatio="none" 
            className="w-full h-12 sm:h-16 text-purple-900 dark:text-purple-950 fill-current"
          >
            <path d="M0,80 C150,0 350,0 500,80 L500,80 L0,80 Z" />
          </svg>
        </div>

        {/* Curved Content Area */}
        <div className="bg-purple-900 dark:bg-purple-950 text-white px-6 pt-2 pb-8 flex flex-col items-center justify-between min-h-[260px]">
          {/* Progress Indicator Dots */}
          <div className="flex items-center gap-1.5 my-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
                  currentSlide === idx 
                    ? "w-8 bg-white" 
                    : "w-2 bg-white/35 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Title and Description Text */}
          <div className="text-center my-4 space-y-3 max-w-xs">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.28 }}
                className="space-y-2.5"
              >
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                  {slide.title}
                </h1>
                <p className="text-xs sm:text-sm text-white/85 leading-relaxed font-normal px-2">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Buttons Row: Back & Next */}
          <div className="w-full flex items-center justify-between pt-4 mt-2">
            <button
              onClick={handleBack}
              disabled={currentSlide === 0}
              className={`text-sm font-semibold transition-opacity cursor-pointer ${
                currentSlide === 0 ? "opacity-0 pointer-events-none" : "text-white/90 hover:text-white"
              }`}
            >
              Back
            </button>

            <button
              onClick={handleNext}
              className="bg-white text-purple-900 dark:text-purple-950 hover:bg-slate-100 font-extrabold px-8 py-3 rounded-full text-sm shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              {currentSlide === slides.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

