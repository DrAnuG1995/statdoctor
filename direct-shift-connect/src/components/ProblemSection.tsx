import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const problems = [
  "Agencies control communication",
  "Endless emails and calls",
  "Hidden conditions",
  "Hard to compare jobs",
  "No reliable hospital feedback",
];

export default function ProblemSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-10">
            Locum Work is Still{" "}
            <span className="text-sd-blue italic">Stuck in the Past</span>
          </h2>
        </motion.div>
        <div className="space-y-3 mb-10">
          {problems.map((p, i) => (
            <motion.div
              key={p}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 bg-card rounded-xl p-4 text-left"
            >
              <X className="w-5 h-5 text-destructive shrink-0" />
              <span className="text-sm font-medium">{p}</span>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 bg-lime text-navy px-6 py-3 rounded-full font-semibold text-lg"
        >
          <Check className="w-5 h-5" />
          StatDoctor fixes this.
        </motion.div>
      </div>
    </section>
  );
}
