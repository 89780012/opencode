"use client"

import * as React from "react"

export type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

export const SidebarContext = React.createContext<SidebarContextProps | null>(null)

export function useSidebar() {
  const ctx = React.useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useSidebar 必须在 SidebarProvider 内使用")
  }

  return ctx
}
