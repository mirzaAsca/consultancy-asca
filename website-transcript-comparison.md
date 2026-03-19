# Transcript vs Website Review

## Overall take

The transcript is stronger on **specific operational substance**.
The website is stronger on **clarity, structure, and sales usability**.

If the website is meant to represent this transcript, it currently captures the **direct tone** but not the transcript's **core mechanism**. The transcript's real differentiators are:

- AI hygiene
- prompt repository / SOP system
- reusable data sources
- amplification vs automation

Your website instead sells:

- AI portfolio visibility
- governance
- board reporting
- implementation oversight

That can still work, but it is **not a tight translation** of the transcript.

## Side-by-side comparison

| Dimension | Transcript | Website | Verdict |
| --- | --- | --- | --- |
| Core message | Clear after repetition: use AI with context, SOPs, data sources, and iteration. | Clear fast: enterprise AI transformation office that maps, governs, and ships AI. | Both clear, but they are not the same offer. |
| Accuracy | **6.5/10**. Mostly solid heuristics, but some absolutes are overstated. | **6/10**. Some strong claims are supported, but several citations are stretched, mismatched, or unsupported. | Transcript slightly better. |
| Specificity | **8.5/10**. Concrete workflows, folders, prompts, and examples. | **7.5/10** on `/how-we-work/`, **6.5/10** on home. Better than average, but still broad in places. | Transcript wins. |
| Clarity / understandability | **6/10**. Good ideas, but too long, repetitive, and full of tangents. | **8/10**. Much easier to scan and understand quickly. | Website wins. |
| Structure | **6/10**. Live-talk energy, weak editorial control. | **8.5/10**. Strong hierarchy, sections, and progressive explanation. | Website wins. |
| Credibility / proof | **6/10**. Strong conviction, but many claims are anecdotal. | **5.5/10**. Better proof framing, but some public claims are not properly substantiated. | Both need tightening. |
| Tone | Energetic, blunt, persuasive, personality-heavy. | Clean, premium, blunt, but sometimes mixes enterprise with slang. | Website is more controlled; transcript is more memorable. |
| Enterprise fit | Moderate. Useful, but feels creator-led and workshop-style. | Good overall, especially on `/how-we-work/`, but slang weakens boardroom trust in spots. | Website wins, but should be cleaner. |
| Differentiation | High. The SOP + data-source system is distinct. | Moderate. Governance + visibility is credible, but more common. | Transcript wins. |
| Conversion readiness | Low as-is. Great source material, not landing-page copy. | High. It is already structured to sell. | Website wins. |
| Alignment between the two | The transcript teaches an internal AI operating system. | The website sells an enterprise transformation/governance service. | Partial alignment only. |

## Transcript validation

### Strong / mostly accurate

- Start a new chat for a new topic: good practice because context bleed is real.
- More iterations usually improve output: directionally true.
- Verify facts and figures: fully correct.
- Use past examples / data sources to shape tone and output: correct and useful.
- Treat repeated AI work like SOPs: strong operational framing.
- "Outsource the typing, not the thinking": strong and accurate as a management heuristic.

### Overstated / needs caveats

- "The longer the prompt, the shorter the output."  
  Useful heuristic, not a rule.
- "AI only sounds like AI if you give it no context."  
  Overstated. Better context helps, but generic writing can still sound generic.
- "AI is not original yet."  
  Too absolute. Better to say it is strongest at recombination and pattern extension.
- "Every one of you should be able to 10x your output."  
  Strong sales language, not a reliable general claim.

### Transcript summary

The transcript is **substantive and specific**, but it needs editing if you want it to read like a premium written asset. Right now it works as a **talk**, not as a **tight published explanation**.

## Website validation

### What is working

- The visual system is clean, premium, and consistent.
- The site is easy to scan.
- `/how-we-work/` is the strongest page because it explains the mechanism instead of only making claims.
- The proof visuals are helpful and materially improve credibility.
- The reading level is accessible for executives.

### What is weak

- The home page uses several hard claims that are not fully supported by the linked sources.
- The main page sometimes sounds broader and more aggressive than the evidence supports.
- Some labels weaken enterprise trust: "Where We've Cooked," "Cooking Show," "The Army," "The Empire."
- The home page is visually polished but a bit washed out because many sections use the same light card treatment.
- Mobile is readable, but the page is long and card-heavy.

## Website fact-check notes

### Supported or mostly supported

- `56% of CEOs report no tangible return from their AI investments` in [src/App.tsx](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L564)  
  Directionally supported by PwC 2026, but the source wording is closer to: CEOs saw **neither higher revenues nor lower costs** from AI.
  Source: https://www.pwc.com/gx/en/ceo-survey/2026/pwc-ceo-survey-2026.pdf

- `EU AI Act — Aug 2, 2026 deadline` in [src/WhatWeDoApp.tsx](/Users/mirzaasceric/Desktop/consultancy-asca/src/WhatWeDoApp.tsx#L165)  
  Broadly reasonable for high-risk obligations, but simplified. Different obligations land on different dates.

- `25–55% task speed gains ... and up to 34% productivity improvement` in [src/components/BusinessAiPrimerSection.tsx](/Users/mirzaasceric/Desktop/consultancy-asca/src/components/BusinessAiPrimerSection.tsx#L130)  
  Directionally supported by BCG, GitHub Copilot, and Stanford research, but you should cite those directly on-page if you keep the claim.
  Sources:
  https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/
  https://www.gsb.stanford.edu/faculty-research/working-papers/generative-ai-work

### Weak or mismatched

- `48% of AI projects ever make it to production` in [src/App.tsx](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L582)  
  The Gartner press release does support the production number, but your wording is a little too absolute. Gartner says: on average, **48% of AI projects make it into production**. Your wording adds "ever," which is stronger than the source.
  Source: https://www.gartner.com/en/newsroom/press-releases/2024-05-07-gartner-survey-finds-generative-ai-is-now-the-most-frequently-deployed-ai-solution-in-organizations

- `Replaces a $350K–$600K/yr internal AI strategy hire` in [src/App.tsx](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L168)  
  Possible, but too stretched as written. "Chief AI Officer" salary is not the same as a generic internal strategy hire. Needs narrower wording or a stronger source.
  Glassdoor range shown publicly is closer to roughly **$264K-$493K** total pay.
  Source: https://www.glassdoor.com/Salaries/chief-ai-officer-salary-SRCH_KO0%2C16.htm

- `$580/head vs. $5,000–$15,000/head industry average` in [src/App.tsx](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L198)  
  The cited Leanware article discusses hourly rates, project pricing, and monthly retainers. It does **not** directly support your per-head comparison.
  Source: https://www.leanware.co/insights/how-much-does-an-ai-consultant-cost

### Incorrect or materially misleading

- `42% of enterprises scrapped AI initiatives last year` in [src/App.tsx](/Users/mirzaasceric/Desktop/consultancy-asca/src/App.tsx#L601)  
  The linked McKinsey 2025 AI report does **not** support this claim. The stronger supported line from that report is that **more than 80%** of respondents do not yet see tangible enterprise-level EBIT impact from gen AI.
  Source: https://www.mckinsey.com/~/media/mckinsey/business%20functions/quantumblack/our-insights/the-state-of-ai/2025/the-state-of-ai-how-organizations-are-rewiring-to-capture-value_final.pdf

### Unverified on-page proof claims

- `$1M+ ARR built in <8 months`
- `25+ companies using our AI systems`
- `20B+ tokens spent`

These may be true, but the page does not show enough proof for a cold visitor. Add a note, case study, or proof modal if you keep them.

## Best single-sentence summary

If I had to summarize it simply:

- The **transcript** is more **specific and differentiated**.
- The **website** is more **clear and commercially usable**.
- The **website still needs stronger factual discipline** if you want it to feel fully credible at enterprise level.
