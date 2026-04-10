import { motion } from "framer-motion";
import { MessageCircle, ShieldCheck, ThumbsUp, Lightbulb } from "lucide-react";

const points = [
  { icon: MessageCircle, text: "Learn from other locums" },
  { icon: ShieldCheck, text: "Other locum reviews" },
  { icon: ThumbsUp, text: "Avoid bad placements" },
  { icon: Lightbulb, text: "Share advice and tips" },
];

export default function CommunitySection() {
  return (
    <section className="py-16 md:py-24 bg-card">
      <div className="container max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            More Than Just <span className="text-sd-blue italic">Shifts</span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            StatDoctor is also a community of locum doctors sharing real experiences.
          </p>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
          {points.map((p, i) => (
            <motion.div
              key={p.text}
              initial={{ opacity: 0, x: -15 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              viewport={{ once: true }}
              className="flex items-center gap-3 p-3 rounded-xl bg-background"
            >
              <p.icon className="w-5 h-5 text-sd-blue shrink-0" />
              <span className="text-sm font-medium">{p.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
