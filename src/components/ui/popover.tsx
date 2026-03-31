'use client'

import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface PopoverContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const PopoverContext = React.createContext<PopoverContextType>({
  open: false,
  setOpen: () => {},
})

interface PopoverProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

export function Popover({ open: controlledOpen, onOpenChange, children }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const open = controlledOpen ?? internalOpen

  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(value)
    }
    onOpenChange?.(value)
  }

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps {
  asChild?: boolean
  children: React.ReactNode
  className?: string
}

export function PopoverTrigger({ children, className, asChild }: PopoverTriggerProps) {
  const { open, setOpen } = React.useContext(PopoverContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        setOpen(!open);
        (children as React.ReactElement<any>).props.onClick?.(e)
      },
    })
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={className}
    >
      {children}
    </button>
  )
}

interface PopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: 'start' | 'center' | 'end'
}

export function PopoverContent({ children, className, align = 'center' }: PopoverContentProps) {
  const { open, setOpen } = React.useContext(PopoverContext)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, setOpen])

  if (!open) return null

  const alignStyles = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute z-50 mt-2 w-72 rounded-md border border-gray-200 bg-white p-4 shadow-md outline-none',
        alignStyles[align],
        className
      )}
    >
      {children}
    </div>
  )
}
