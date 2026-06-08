import * as React from "react"

const MOBILE_BREAKPOINT = 768
const TABLET_BREAKPOINT = 1024

function readIsMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < MOBILE_BREAKPOINT
}

function readIsTabletOrMobile() {
  if (typeof window === 'undefined') return false
  return window.innerWidth < TABLET_BREAKPOINT
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(readIsMobile)

  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    checkIsMobile()
    window.addEventListener("resize", checkIsMobile)

    return () => window.removeEventListener("resize", checkIsMobile)
  }, [])

  return isMobile
}

export function useIsTabletOrMobile() {
  const [isTabletOrMobile, setIsTabletOrMobile] = React.useState(readIsTabletOrMobile)

  React.useEffect(() => {
    const check = () => {
      setIsTabletOrMobile(window.innerWidth < TABLET_BREAKPOINT)
    }

    check()
    window.addEventListener("resize", check)
    return () => window.removeEventListener("resize", check)
  }, [])

  return isTabletOrMobile
}
