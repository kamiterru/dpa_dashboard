'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ─── Context ──────────────────────────────────────────────────────────────────

interface NavGuardCtx {
  isDirty: boolean
  setDirty: (dirty: boolean) => void
  /** Call with a proceed callback. If dirty, shows the unsaved-changes modal first. */
  requestNavigation: (proceed: () => void) => void
}

const NavGuardContext = createContext<NavGuardCtx>({
  isDirty: false,
  setDirty: () => {},
  requestNavigation: (proceed) => proceed(),
})

export function useNavGuard() {
  return useContext(NavGuardContext)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirtyState] = useState(false)
  // Store the proceed callback in an object to avoid React calling it as an initializer
  const [pending, setPending] = useState<{ fn: () => void } | null>(null)

  const setDirty = useCallback((dirty: boolean) => setIsDirtyState(dirty), [])

  const requestNavigation = useCallback(
    (proceed: () => void) => {
      if (!isDirty) {
        proceed()
        return
      }
      setPending({ fn: proceed })
    },
    [isDirty],
  )

  function handleConfirm() {
    const fn = pending?.fn
    setIsDirtyState(false)
    setPending(null)
    fn?.()
  }

  function handleCancel() {
    setPending(null)
  }

  return (
    <NavGuardContext.Provider value={{ isDirty, setDirty, requestNavigation }}>
      {children}

      {/* ── Unsaved-changes modal ── */}
      {pending !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[8px] w-[500px] max-w-[90vw] px-6 py-[42px] flex flex-col gap-10">
            <div className="flex flex-col gap-[26px]">
              <h2 className="font-poppins font-semibold text-[24px] leading-[28px] text-black">
                Are you sure you want to leave without saving your changes?
              </h2>
              <p className="text-[16px] text-[#475569] leading-[23px]">
                The changes you have currently made will not be saved if you continue.
              </p>
            </div>
            <div className="flex gap-[14px] items-center justify-end">
              <button
                onClick={handleCancel}
                className="border-2 border-[#1e293b] rounded-[8px] px-4 py-2 font-poppins font-semibold text-[14px] leading-5 text-[#1e293b]"
              >
                No, go back
              </button>
              <button
                onClick={handleConfirm}
                className="bg-[#2c53ab] rounded-[8px] px-4 py-2 font-poppins font-semibold text-[14px] leading-5 text-white"
              >
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </NavGuardContext.Provider>
  )
}
