import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import brianRoseImg from "@/assets/brian-rose.png";

const testimonials = [
  {
    quote: "StatDoctor enables me to see all available shifts on my own device, on my own terms. No annoying phone calls. It's the stress-free approach to locuming.",
    name: "Dr Brian Rose",
    title: "MD, HMO",
    img: brianRoseImg,
  },
  {
    quote: "Such an easy-to-use platform that gives locum doctors more control of their shifts.",
    name: "Dr Marillo Jayasuriya",
    title: "MD, FACEM",
    img: "https://cdn.prod.website-files.com/688db6d677516719c3925d01/697b6440a3f19ada5550b8b8_1702447089847.jpeg",
  },
  {
    quote: "A great initiative to help doctors be in charge of their own work-life balance with the ease of picking up shifts on demand.",
    name: "Dr Layth Samari",
    title: "MD, ACEM Trainee",
    img: "https://cdn.prod.website-files.com/688db6d677516719c3925d01/697828648e6bd8e828e91b1c_statdocto_doctors_available-07-03.png",
  },
  {
    quote: "The whole process was extremely easy and straightforward! It's transparent with no hidden T&C unlike many agencies. Truly a game changer for locum doctors.",
    name: "Dr Greeshma Gopakumar",
    title: "MD, HMO",
    img: "https://cdn.prod.website-files.com/688db6d677516719c3925d01/6978195af46d2753c3e3422d_Adobe%20Express%20-%20file%20(26).png",
  },
];

export default function TrustSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">
            Why Our Doctors <span className="text-sd-blue">❤️</span> Us
          </h2>
          <p className="text-muted-foreground">Built by Australian locum doctors · Used by hospitals across Australia</p>
        </motion.div>
        <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-6 shadow-sm"
            >
              <Quote className="w-6 h-6 text-sd-blue mb-3" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <img
                  src={t.img}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                />
                <div>
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.title}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
