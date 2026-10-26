import { useState } from "react"
import LandingPage from "./components/landing-page"
import Playground from "./components/Playground"

export default function App() {
  const [view, setView] = useState<"landing" | "playground">("landing")

  return (
    <>
      {view === "landing" ? (
        <LandingPage onStart={() => setView("playground")} />
      ) : (
        <Playground />
      )}
    </>
  )
}
