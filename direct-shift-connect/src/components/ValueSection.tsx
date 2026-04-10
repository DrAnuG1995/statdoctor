import { motion } from "framer-motion";
import { Hospital, Eye, Users, Star, Stethoscope, DollarSign } from "lucide-react";

const values = [
  { icon: DollarSign, title: "Higher rates", desc: "No agency commissions", highlight: true },
  { icon: Hospital, title: "Direct hospital contact", desc: "No agency contracts", highlight: false },
  { icon: Eye, title: "Transparent shift details", desc: "Know the rate and conditions upfront", highlight: false },
  
  { icon: Users, title: "Locum community", desc: "Connect with other locum doctors and share advice", highlight: false },
  { icon: Star, title: "Real hospital insights", desc: "See reviews and experiences from other locums", highlight: false },
  { icon: Stethoscope, title: "Built by a locum doctor", desc: "Designed for real workflows", highlight: false },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function ValueSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12"
        >
          Why Doctors Use <span className="text-sd-blue italic">StatDoctor</span>
        </motion.h2>
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto"
        >
          {values.map((v) => (
            <motion.div
              key={v.title}
              variants={item}
              className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <v.icon className="w-8 h-8 mb-3 text-sd-blue" />
              <h3 className="font-semibold text-lg mb-1">{v.title}</h3>
              <p className="text-muted-foreground text-sm">{v.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
