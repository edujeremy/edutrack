'use client'

import React, { useState } from 'react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sidebar } from '@/components/layout/Sidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import type { Profile } from '@/lib/types'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          redirect('/login')
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error || !data) {
          redirect('/login')
        }

        setProfile(data as Profile)
      } catch (error) {
        console.error('Error loading profile:', error)
        redirect('/login')
      } finally {
        setIsLoading(false)
      }
    }

    loadUserProfile()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    redirect('/login')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <LoadingSpinner size="lg" label="로딩 중..." />
      </div>
    )
  }

  if (!profile) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={profile.role}
        userName={profile.name}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Menu Toggle */}
        <div className="lg:hidden px-4 py-4 border-b border-gray-200 bg-white">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
