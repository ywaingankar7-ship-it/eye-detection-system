import React from "react";
import { motion } from "motion/react";
import { Info, Cpu, Zap, Shield, Globe, Code2 } from "lucide-react";

export default function About() {
  const technologies = [
    { name: "React 19", icon: Code2, desc: "Modern UI library for high-performance interfaces" },
    { name: "Gemini 3.1 Pro", icon: Cpu, desc: "Advanced AI for clinical-grade eye diagnosis" },
    { name: "Firebase", icon: Zap, desc: "Real-time database and secure authentication" },
    { name: "Tailwind CSS", icon: Globe, desc: "Utility-first CSS for responsive, modern design" },
    { name: "Framer Motion", icon: Zap, desc: "Fluid animations for immersive user experience" },
    { name: "Lucide React", icon: Info, desc: "Crisp, consistent SVG icons for better UX" }
  ];

  const features = [
    "AI-Powered Eye Power Detection",
    "Real-time Appointment Management",
    "Digital Prescription Storage",
    "Inventory & Stock Tracking",
    "Patient Portal for Self-Service",
    "Advanced Analytics Dashboard",
    "Virtual Frame Try-On (Beta)"
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-black tracking-tight gradient-text uppercase">About EyePower AI</h1>
        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
          Revolutionizing optometry through the power of artificial intelligence and real-time data management.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 space-y-6"
        >
          <div className="flex items-center gap-3 text-cyan-400">
            <Shield className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Our Purpose</h2>
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            EyePower AI was built to bridge the gap between traditional optometry and modern technology. 
            Our mission is to provide accessible, high-precision eye diagnosis tools to everyone, 
            while empowering eye clinics with a robust, all-in-one management platform.
          </p>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            By leveraging Google's Gemini 3.1 Pro AI, we can analyze retinal images and vision tests 
            with a level of accuracy that supports clinical decision-making and improves patient outcomes.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-8 space-y-6"
        >
          <div className="flex items-center gap-3 text-violet-400">
            <Zap className="w-6 h-6" />
            <h2 className="text-2xl font-bold">Key Features</h2>
          </div>
          <ul className="space-y-3">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-[var(--text-secondary)]">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                {feature}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center">Technology Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {technologies.map((tech, i) => (
            <motion.div 
              key={tech.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 + 0.3 }}
              className="glass-card p-4 flex items-start gap-4 hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <tech.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">{tech.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{tech.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center pt-8 border-t border-[var(--glass-border)]"
      >
        <p className="text-sm text-[var(--text-secondary)]">
          &copy; 2026 EyePower AI. All rights reserved. Version 2.1.0-stable
        </p>
      </motion.div>
    </div>
  );
}
