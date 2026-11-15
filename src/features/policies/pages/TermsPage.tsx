import { ArrowUpRight, BookOpenText } from "lucide-react"
import { Link } from "react-router-dom"
import type { ReactNode } from "react"

import termsSource from "../data/terms.md?raw"

type Block = { kind: "paragraph" | "list"; lines: string[] }
type Section = { title: string; id: string; blocks: Block[] }

const lines = termsSource.replace(/\r\n/g, "\n").split("\n")
const version = termsSource.match(/\*\*Version ([^*]+)\*\*/)?.[1]
const effectiveDate = termsSource.match(/\*\*Effective Date:\*\* ([^\n]+)/)?.[1]
const updatedDate = termsSource.match(/\*\*Last Updated:\*\* ([^\n]+)/)?.[1]

function sectionId(title: string) {
  const number = title.match(/^(\d+)\./)?.[1]
  return number ? `section-${number}` : title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function parseSections(): Section[] {
  const result: Section[] = []
  let current: Section | null = null
  let paragraph: string[] = []
  let list: string[] = []
  let inContents = false

  const flush = () => {
    if (!current) return
    if (paragraph.length) current.blocks.push({ kind: "paragraph", lines: [paragraph.join(" ")] })
    if (list.length) current.blocks.push({ kind: "list", lines: list })
    paragraph = []
    list = []
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (line.startsWith("### ")) {
      flush()
      const title = line.slice(4).trim()
      inContents = title === "TABLE OF CONTENTS"
      current = inContents ? null : { title, id: sectionId(title), blocks: [] }
      if (current) result.push(current)
      continue
    }
    if (inContents || !current || !line || line === "---" || line.startsWith("# ") || line.startsWith("## ")) {
      if (!line || line === "---") flush()
      continue
    }
    if (line.startsWith("* ")) {
      if (paragraph.length) {
        current.blocks.push({ kind: "paragraph", lines: [paragraph.join(" ")] })
        paragraph = []
      }
      list.push(line.slice(2))
    } else {
      if (list.length) {
        current.blocks.push({ kind: "list", lines: list })
        list = []
      }
      paragraph.push(line)
    }
  }
  flush()
  return result
}

const sections = parseSections()

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>
    if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part)) return <a key={index} href={`mailto:${part}`}>{part}</a>
    return part
  })
}

export default function TermsPage() {
  return (
    <div className="terms-page">
      <div className="terms-hero">
        <div className="terms-hero-inner">
          <div className="terms-eyebrow"><span /> PEGAXUS / LEGAL</div>
          <h1>Policies <span>&amp;</span> terms</h1>
          <p className="terms-hero-intro">Terms and conditions of service for the Pegaxus System and equine transport services.</p>
          <div className="terms-meta">
            {version && <span>VERSION {version}</span>}
            {effectiveDate && <span>Effective {effectiveDate}</span>}
            {updatedDate && <span>Last updated {updatedDate}</span>}
          </div>
        </div>
      </div>

      <div className="terms-layout">
        <aside className="terms-index" aria-label="On this page">
          <div className="terms-index-inner">
            <div className="terms-index-heading"><BookOpenText size={17} strokeWidth={1.6} /> ON THIS PAGE</div>
            <nav>
              {sections.map((section) => <a key={section.id} href={`#${section.id}`}>{section.title}</a>)}
            </nav>
          </div>
        </aside>
        <article className="terms-document" id="document">
          <div className="terms-document-heading">
            <div><span className="terms-kicker">OFFICIAL DOCUMENT</span><h2>Terms and conditions of service</h2></div>
            <span className="terms-document-count">{sections.filter((section) => /^\d+\./.test(section.title)).length} SECTIONS</span>
          </div>
          {sections.map((section) => (
            <section className="terms-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
              <div className="terms-section-title">
                <span>{section.title.match(/^(\d+)\./)?.[1]?.padStart(2, "0") ?? "00"}</span>
                <h3 id={`${section.id}-title`}>{section.title.replace(/^\d+\.\s*/, "")}</h3>
              </div>
              <div className="terms-section-body">
                {section.blocks.map((block, index) => block.kind === "list"
                  ? <ul key={index}>{block.lines.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>
                  : <p key={index}>{inline(block.lines[0])}</p>)}
              </div>
            </section>
          ))}
          <div className="terms-end"><span>END OF DOCUMENT</span><Link to="/">Return to home <ArrowUpRight size={15} /></Link></div>
        </article>
      </div>
    </div>
  )
}
