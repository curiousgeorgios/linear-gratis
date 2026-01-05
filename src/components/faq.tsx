'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'Is my data secure?',
    answer:
      'Your Linear API token is encrypted with AES-256 encryption before storage. We never store your Linear data – we fetch it in real-time when visitors view your boards. All connections are secured with HTTPS.',
  },
  {
    question: 'How does the Linear API token work?',
    answer:
      'You create a personal API token in Linear\'s settings. We use it to read your projects and issues. The token only has read access unless you enable issue creation on your public views.',
  },
  {
    question: 'What happens if linear.gratis shuts down?',
    answer:
      'We\'re fully open source. You can self-host the entire platform, and your data stays in your Linear workspace. There\'s no lock-in – your Linear data is always yours.',
  },
  {
    question: 'Are there any limits?',
    answer:
      'No limits on forms, views, roadmaps, or submissions. We don\'t throttle usage or restrict features based on plan tiers because there are no tiers – everything is free.',
  },
  {
    question: 'How is this completely free?',
    answer:
      'We believe Linear accessibility shouldn\'t be paywalled. The project is maintained by the community and runs on minimal infrastructure. It\'s free because we think it should be.',
  },
]

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-5 text-left transition-colors hover:text-primary"
      >
        <span className="font-medium pr-4">{question}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="overflow-hidden">
          <p className="pb-5 text-muted-foreground leading-relaxed">{answer}</p>
        </div>
      </div>
    </div>
  )
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 px-6">
      {faqs.map((faq, index) => (
        <FAQItem
          key={index}
          question={faq.question}
          answer={faq.answer}
          isOpen={openIndex === index}
          onToggle={() => setOpenIndex(openIndex === index ? null : index)}
        />
      ))}
    </div>
  )
}
