"use client"

import { useEffect, useRef, useState } from "react"
import { CaretDown } from "@phosphor-icons/react/dist/ssr"

const FAQS = [
  {
    question: "What is Syntrix AI?",
    answer:
      "Syntrix is an autonomous AI data intelligence platform — a virtual team that understands datasets, runs analysis, trains models, explains predictions, and produces Markdown + PDF reports.",
  },
  {
    question: "What can I do in the demo?",
    answer:
      "Sign in, create projects/workspaces, upload datasets, run EDA, train experiments, inspect SHAP explanations, chat with agents, and download reports.",
  },
  {
    question: "How is auth handled?",
    answer:
      "Supabase Auth powers email verification, password reset, and Google sign-in. API access is JWT-scoped to the signed-in owner.",
  },
  {
    question: "Do I need my own LLM?",
    answer:
      "Optional. Local Ollama improves chat/agent narration. Classical ML training runs through the Syntrix ML engine regardless.",
  },
  {
    question: "What stack is this built on?",
    answer:
      "Next.js frontend, FastAPI backend, LangGraph agents, Celery workers, Redis, Supabase Postgres/Auth/Storage, and optional MLflow.",
  },
  {
    question: "Is this production-ready?",
    answer:
      "Phases 1–6 are implemented for a portfolio-quality demo path on Supabase Cloud. Treat it as a strong foundation, not a hardened multi-tenant SaaS.",
  },
]

function FAQItem({
  question,
  answer,
  isOpen,
  onClick,
  delay,
  isVisible,
}: {
  question: string
  answer: string
  isOpen: boolean
  onClick: () => void
  delay: number
  isVisible: boolean
}) {
  return (
    <div
      className={`border-b border-[var(--color-baltic-sea-800)] transition-all duration-500 ${
        isVisible ? "opacity-100 translate-x-0" : `opacity-0 ${delay % 2 === 0 ? "-translate-x-8" : "translate-x-8"}`
      }`}
      style={{ transitionDelay: `${delay * 75 + 200}ms` }}
    >
      <button onClick={onClick} className="w-full flex items-center justify-between py-5 text-left group">
        <span className="font-medium text-[var(--color-baltic-sea-200)] group-hover:text-[var(--color-keppel-400)] transition-colors">
          {question}
        </span>
        <CaretDown
          weight="bold"
          className={`h-5 w-5 text-[var(--color-baltic-sea-500)] group-hover:text-[var(--color-keppel-400)] transition-all duration-300 ${isOpen ? "rotate-180 text-[var(--color-keppel-400)]" : ""}`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-[var(--color-baltic-sea-400)] leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section id="faq" ref={ref} className="py-24 border-t border-[var(--color-baltic-sea-900)] overflow-hidden">
      <div className="mx-auto max-w-[800px] px-2.5 sm:px-6 lg:px-12">
        <div
          className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-12 blur-sm"}`}
        >
          <span className="text-sm font-medium text-[var(--color-keppel-400)] uppercase tracking-wider">FAQ</span>
          <h2 className="mt-3 text-3xl font-bold text-[var(--color-baltic-sea-100)] md:text-4xl">
            Frequently asked questions
          </h2>
        </div>

        <div>
          {FAQS.map((faq, i) => (
            <FAQItem
              key={faq.question}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              delay={i}
              isVisible={isVisible}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
