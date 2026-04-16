import { useRef } from "react"
import { Link } from "react-router-dom"
import { motion, useScroll, useTransform } from "framer-motion"
import { Navbar } from "@/components/Navbar"
import { Button } from "@/components/ui/button"

function ArtifactMock() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 w-full">
      {/* PPT deck mock */}
      <div className="rounded-xl bg-card border border-border p-3 md:p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-muted-foreground">proposal.pptx</span>
        </div>

        {/* Hero slide (flatter) */}
        <div className="aspect-[21/9] rounded-md bg-gradient-to-br from-indigo-500/30 via-fuchsia-500/20 to-background border border-border p-3 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <span className="text-[9px] font-semibold tracking-widest uppercase text-white/70">
              Proposal
            </span>
          </div>
          <div>
            <div className="text-[13px] font-semibold leading-tight text-white">
              Acme × Contoso
            </div>
            <div className="text-[10px] text-white/70 mt-0.5">
              Enterprise Analytics Platform
            </div>
          </div>
          <div className="flex items-center justify-between text-[8px] text-white/50">
            <span>Q2 2026</span>
            <span>01 / 12</span>
          </div>
        </div>

        {/* Thumbnail slides — single row */}
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {/* Exec Summary */}
          <div className="aspect-video rounded bg-muted/30 border border-border p-1.5 flex flex-col gap-0.5">
            <div className="text-[6px] font-semibold text-white/80 uppercase tracking-wider">
              Exec
            </div>
            <div className="h-0.5 w-1/2 rounded bg-white/70" />
            <div className="h-0.5 w-2/3 rounded bg-white/30" />
          </div>
          {/* Solution chart */}
          <div className="aspect-video rounded bg-muted/30 border border-border p-1.5 flex flex-col">
            <div className="text-[6px] font-semibold text-white/80 uppercase tracking-wider mb-0.5">
              Solution
            </div>
            <div className="flex-1 flex items-end gap-0.5">
              <div className="flex-1 bg-emerald-400/70 rounded-sm h-[40%]" />
              <div className="flex-1 bg-emerald-400/70 rounded-sm h-[60%]" />
              <div className="flex-1 bg-emerald-400/80 rounded-sm h-[80%]" />
              <div className="flex-1 bg-emerald-400/80 rounded-sm h-[95%]" />
            </div>
          </div>
          {/* Why Us */}
          <div className="aspect-video rounded bg-muted/30 border border-border p-1.5 flex flex-col gap-0.5">
            <div className="text-[6px] font-semibold text-white/80 uppercase tracking-wider">
              Why Us
            </div>
            <div className="flex gap-0.5 items-center">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400/70" />
              <div className="h-0.5 flex-1 rounded bg-white/40" />
            </div>
            <div className="flex gap-0.5 items-center">
              <div className="h-1.5 w-1.5 rounded-full bg-fuchsia-400/70" />
              <div className="h-0.5 flex-1 rounded bg-white/40" />
            </div>
          </div>
          {/* Roadmap */}
          <div className="aspect-video rounded bg-muted/30 border border-border p-1.5 flex flex-col">
            <div className="text-[6px] font-semibold text-white/80 uppercase tracking-wider mb-0.5">
              Roadmap
            </div>
            <div className="flex-1 flex items-center">
              <div className="relative w-full h-0.5 bg-white/15 rounded">
                <span className="absolute left-0 -top-[2px] h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="absolute left-1/2 -top-[2px] h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
                <span className="absolute right-0 -top-[2px] h-1.5 w-1.5 rounded-full bg-white/30" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Excel sheet mock */}
      <div className="rounded-xl bg-card border border-border p-3 md:p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="text-xs text-muted-foreground">discovery.xlsx</span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border rounded overflow-hidden">
          {["Category", "Question", "Priority", "Risk"].map((h) => (
            <div
              key={h}
              className="bg-muted px-2 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider"
            >
              {h}
            </div>
          ))}
          {[
            ["Functional", "Auth model", "High", "Med"],
            ["Technical", "SLAs", "High", "High"],
            ["Security", "Data residency", "High", "High"],
            ["Commercial", "Payment terms", "Med", "Low"],
          ]
            .flat()
            .map((cell, i) => (
              <div
                key={i}
                className="bg-card px-2 py-1 text-[10px] text-foreground/80"
              >
                {cell}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const testimonialRef = useRef<HTMLDivElement | null>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  })

  const heroY = useTransform(scrollYProgress, [0, 1], [0, -200])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const artifactY = useTransform(scrollYProgress, [0, 1], [0, -250])

  const testimonialWords =
    "PitchCraft turned a 40-page RFP into a polished deck and a discovery sheet in minutes. Our sales team stopped copy-pasting and started closing.".split(
      " "
    )

  const { scrollYProgress: testimonialProgress } = useScroll({
    target: testimonialRef,
    offset: ["start end", "end center"],
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Section 1: Hero */}
      <section
        ref={sectionRef}
        className="relative min-h-screen overflow-hidden"
      >
        {/* Background video covering the whole hero */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/hero.mp4"
        />
        {/* Dark overlay for legibility */}
        <div className="absolute inset-0 bg-background/70 z-10 pointer-events-none" />
        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

        <div className="relative z-30">
          <Navbar />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-30 flex flex-col items-center text-center mt-6 md:mt-10 px-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0 }}
            className="liquid-glass inline-flex items-center gap-2 rounded-lg px-3 py-2 mb-6"
          >
            {/* <span className="bg-white text-black rounded-md text-sm font-medium px-2 py-0.5">
              New
            </span> */}
            <span className="text-sm font-medium text-muted-foreground">
              RFP → Deck + Sheet in minutes
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl font-medium tracking-[-1px] md:tracking-[-2px] leading-tight md:leading-[1.15] mb-3"
          >
            Turn RFPs Into.
            <br />
            Winning{" "}
            <span className="font-serif italic font-normal">Proposals.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ color: "var(--hero-subtitle)" }}
            className="text-sm sm:text-base md:text-lg font-normal leading-6 opacity-90 mb-6 max-w-xl px-2"
          >
            PitchCraft reads your RFP, builds a proposal deck and a structured
            discovery workbook — grounded in the actual document.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/signup">
              <Button
                size="lg"
                className="rounded-full px-8 py-5 text-base font-medium bg-foreground text-background hover:bg-foreground/90 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                Get Started for Free
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Artifact mocks sit directly below the CTA, over the video */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{ y: artifactY }}
          className="relative z-30 mt-8 md:mt-10 px-4 flex justify-center"
        >
          <div className="max-w-6xl w-full">
            <ArtifactMock />
          </div>
        </motion.div>
      </section>

      {/* Section 2: Testimonial */}
      <section
        ref={testimonialRef}
        className="min-h-screen flex items-center py-16 md:py-32 px-4 sm:px-8 md:px-28"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-start gap-6 md:gap-10">
          <div className="w-14 h-10 flex items-start text-5xl md:text-6xl leading-none text-foreground font-serif">
            “
          </div>
          <div className="text-2xl sm:text-3xl md:text-5xl font-medium leading-[1.2] flex flex-wrap">
            {testimonialWords.map((word, i) => {
              const start = i / testimonialWords.length
              const end = (i + 1) / testimonialWords.length
              const opacity = useTransform(
                testimonialProgress,
                [start, end],
                [0.2, 1]
              )
              const color = useTransform(
                testimonialProgress,
                [start, end],
                ["hsl(0 0% 35%)", "hsl(0 0% 100%)"]
              )
              return (
                <motion.span
                  key={i}
                  style={{ opacity, color }}
                  className="mr-[0.3em]"
                >
                  {word}
                </motion.span>
              )
            })}
            <span className="text-muted-foreground ml-2">”</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-[3px] border-foreground bg-muted flex items-center justify-center text-foreground font-semibold">
              BS
            </div>
            <div>
              <div className="text-base font-semibold leading-7 text-foreground">
                Brooklyn Simmons
              </div>
              <div className="text-sm font-normal leading-5 text-muted-foreground">
                Sales Lead, Acme Corp
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer
        id="contact"
        className="border-t border-border py-6 md:py-8 px-4 sm:px-8 md:px-28 text-xs sm:text-sm text-muted-foreground"
      >
        © 2026 PitchCraft. Contact us at hello@pitchcraft.ai
      </footer>
    </div>
  )
}
