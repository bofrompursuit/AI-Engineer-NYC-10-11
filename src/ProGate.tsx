import { useEffect, useState, type ReactNode } from "react"
import type { Package } from "@revenuecat/purchases-js"
import PeachesPoster from "./PeachesPoster"
import { getJourney } from "./journeys"
import { buyPro, hasPro, isPremium, proPackages, type Mission } from "./revenuecat"

type Status = "checking" | "locked" | "unlocked" | "error"

const bingo = {
  letter: "04",
  title: "TINY Math Bingo",
  description: "Solve 16 algebra, exponent and geometry problems. Stamp four in a row to win.",
  accent: "purple",
}
const missionInfo = (id: Mission) => (id === "bingo" ? bingo : getJourney(id))

export default function ProGate({ id, onBack, onFree, children }: { id: Mission; onBack: () => void; onFree: () => void; children: ReactNode }) {
  const premium = isPremium(id)
  const [status, setStatus] = useState<Status>(premium ? "checking" : "unlocked")
  const [packages, setPackages] = useState<Package[]>([])
  const [buying, setBuying] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (!premium) return setStatus("unlocked")
    let live = true
    setStatus("checking")
    hasPro()
      .then(async (pro) => {
        if (pro) return live && setStatus("unlocked")
        const available = await proPackages()
        if (!live) return
        setPackages(available)
        setStatus("locked")
      })
      .catch(() => live && setStatus("error"))
    return () => { live = false }
  }, [id, premium])

  if (status === "unlocked") return <>{children}</>

  const journey = missionInfo(id)
  const buy = async (rcPackage: Package) => {
    setBuying(rcPackage.identifier)
    setMessage("")
    try {
      if (await buyPro(rcPackage)) setStatus("unlocked")
    } catch {
      setMessage("Checkout didn't finish. You haven't been charged. Try again in a moment.")
    } finally {
      setBuying(null)
    }
  }

  return (
    <main className={`subpage learning-journey accent-${journey.accent}`}>
      <div className="subpage-top">
        <button className="btn btn-outline" type="button" onClick={onBack}>← MISSION HUB</button>
        <span className="case-live"><i /> {id === "bingo" ? "MISSION" : "JOURNEY"} {journey.letter}</span>
        <span className="case-id">UNFOLD PRO</span>
      </div>
      <section className="journey-complete panel pro-gate" aria-labelledby="pro-title" aria-busy={status === "checking"}>
        <span className="pro-gate-peaches"><PeachesPoster /></span>
        <span className="eyebrow">UNFOLD PRO JOURNEY</span>
        <h1 id="pro-title">{journey.title}</h1>
        {status === "checking" && <p role="status">Peaches is checking your pass…</p>}
        {status === "error" && <p role="alert">Peaches couldn't reach the store. Physics is still free while we sort it out.</p>}
        {status === "locked" && (
          <>
            <p>{journey.description} Unlock every premium journey with Unfold Pro.</p>
            {packages.length ? (
              <div className="pro-gate-plans">
                {packages.map((rcPackage) => (
                  <button key={rcPackage.identifier} className="btn btn-primary" type="button" disabled={Boolean(buying)} onClick={() => buy(rcPackage)}>
                    {buying === rcPackage.identifier ? "OPENING CHECKOUT…" : `${rcPackage.webBillingProduct.title.toUpperCase()} · ${rcPackage.webBillingProduct.currentPrice.formattedPrice}`}
                  </button>
                ))}
              </div>
            ) : (
              <p role="status">Pro plans aren't available yet. Check back soon.</p>
            )}
            {message && <p role="alert" className="pro-gate-error">{message}</p>}
          </>
        )}
        <button className="btn btn-ghost" type="button" onClick={onFree}>PLAY PHYSICS FOR FREE</button>
      </section>
    </main>
  )
}
