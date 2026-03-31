'use client'

import React, { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Search } from 'lucide-react'

interface CommandContextType {
  search: string
  setSearch: (search: string) => void
}

const CommandContext = React.createContext<CommandContextType>({
  search: '',
  setSearch: () => {},
})

interface CommandProps {
  children: React.ReactNode
  className?: string
}

export function Command({ children, className }: CommandProps) {
  const [search, setSearch] = useState('')

  return (
    <CommandContext.Provider value={{ search, setSearch }}>
      <div
        className={cn(
          'flex flex-col overflow-hidden rounded-md bg-white text-gray-900',
          className
        )}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

interface CommandInputProps {
  placeholder?: string
  className?: string
  value?: string
  onValueChange?: (value: string) => void
}

export function CommandInput({
  placeholder,
  className,
  value,
  onValueChange,
}: CommandInputProps) {
  const { search, setSearch } = React.useContext(CommandContext)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    onValueChange?.(e.target.value)
  }

  return (
    <div className="flex items-center border-b px-3">
      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
      <input
        type="text"
        placeholder={placeholder}
        value={value ?? search}
        onChange={handleChange}
        className={cn(
          'flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
      />
    </div>
  )
}

interface CommandEmptyProps {
  children: React.ReactNode
}

export function CommandEmpty({ children }: CommandEmptyProps) {
  return <div className="py-6 text-center text-sm text-gray-500">{children}</div>
}

interface CommandGroupProps {
  children: React.ReactNode
  heading?: string
  className?: string
}

export function CommandGroup({ children, heading, className }: CommandGroupProps) {
  return (
    <div className={cn('overflow-hidden p-1', className)}>
      {heading && (
        <div className="px-2 py-1.5 text-xs font-medium text-gray-500">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
}

interface CommandItemProps {
  children: React.ReactNode
  onSelect?: (value: string) => void
  value?: string
  className?: string
}

export function CommandItem({
  children,
  onSelect,
  value,
  className,
}: CommandItemProps) {
  return (
    <div
      onClick={() => onSelect?.(value || '')}
      className={cn(
        'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
    >
      {children}
    </div>
  )
}
