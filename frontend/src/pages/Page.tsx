import type { ReactNode } from 'react'
import { ShaderBackground } from '../components/ShaderBackground'
import './Page.css'

export default function Page({
  kicker,
  title,
  lead,
  children,
}: {
  kicker: string
  title: string
  lead: string
  children?: ReactNode
}) {
  return (
    <main className="ta-page">
      <section className="ta-page__hero ta-page__hero--shader">
        <ShaderBackground className="ta-page__shader" />
        <div className="ta-page__wrap">
          <p className="ta-page__kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="ta-page__lead">{lead}</p>
        </div>
      </section>
      <div className="ta-page__wrap ta-page__body">{children}</div>
    </main>
  )
}
