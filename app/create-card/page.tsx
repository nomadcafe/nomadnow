'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/hooks/useToast'
import { ToastContainer } from '@/components/Toast'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { CountrySelector } from '@/components/CountrySelector'
import { Logo } from '@/components/Logo'
import { debounce } from '@/lib/debounce'

type HandleStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'
type LinkType =
  | 'website'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'github'
  | 'youtube'
  | 'tiktok'
  | 'threads'
  | 'substack'
  | 'telegram'
  | 'other'

// Listed in the order shown in the dropdown — Website first since it's the
// most common, then social platforms grouped by audience overlap.
const LINK_TYPE_OPTIONS: { value: LinkType; label: string }[] = [
  { value: 'website', label: 'Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'threads', label: 'Threads' },
  { value: 'substack', label: 'Substack' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'other', label: 'Other' },
]

interface NomadLink {
  type: LinkType
  label?: string
  url: string
}

const ROLES = [
  'Designer',
  'Developer',
  'Writer',
  'Product Manager',
  'Marketer',
  'Consultant',
  'Entrepreneur',
  'Photographer',
  'Content Creator',
  'Other',
]

const WORK_STATUSES = [
  { value: 'available', label: 'Open to collaboration' },
  { value: 'freelancing', label: 'Freelancing' },
  { value: 'busy', label: 'Busy' },
  { value: 'fulltime', label: 'Full-time' },
]

const STORAGE_KEY = 'nomad-card-draft'

export default function CreateCardPage() {
  const router = useRouter()
  const { toasts, showSuccess, showError, removeToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [handleStatus, setHandleStatus] = useState<HandleStatus>('idle')
  const [handleError, setHandleError] = useState<string>('')
  const [showMore, setShowMore] = useState(false)

  const loadDraft = () => {
    if (typeof window === 'undefined') return null
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved)
    } catch {
      // Ignore parse errors
    }
    return null
  }

  const savedDraft = loadDraft()
  const [formData, setFormData] = useState({
    handle: savedDraft?.handle || '',
    display_name: savedDraft?.display_name || '',
    role: savedDraft?.role || '',
    bio: savedDraft?.bio || '',
    current_city: savedDraft?.current_city || '',
    hometown: savedDraft?.hometown || '',
    work_status: (savedDraft?.work_status || 'available') as 'available' | 'busy' | 'fulltime' | 'freelancing',
    avatar_url: savedDraft?.avatar_url || '',
  })
  const [visitedCountries, setVisitedCountries] = useState<string[]>(savedDraft?.visitedCountries || [])
  const [links, setLinks] = useState<NomadLink[]>(savedDraft?.links || [])

  // Auto-expand the optional section if the user has any saved draft data in it,
  // so they don't lose visibility into in-progress work.
  // Also: if the page was opened with ?handle=xxx (e.g. from the 404 "Claim this"
  // CTA), prefill that handle, overriding any saved draft so the intent is honored.
  useEffect(() => {
    if (
      savedDraft &&
      (savedDraft.role || savedDraft.bio || savedDraft.hometown ||
        (savedDraft.visitedCountries?.length ?? 0) > 0 ||
        (savedDraft.links?.length ?? 0) > 0 ||
        savedDraft.avatar_url)
    ) {
      setShowMore(true)
    }

    if (typeof window !== 'undefined') {
      const prefill = new URLSearchParams(window.location.search).get('handle')
      if (prefill) {
        const cleaned = prefill.trim().toLowerCase().slice(0, 50)
        if (cleaned) {
          setFormData((prev) => ({ ...prev, handle: cleaned }))
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const draft = { ...formData, visitedCountries, links }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
    } catch {
      // Ignore storage errors
    }
  }, [formData, visitedCountries, links])

  const clearDraft = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignore
    }
  }

  const checkHandleAvailability = useCallback(
    debounce(async (handle: string) => {
      if (!handle.trim()) {
        setHandleStatus('idle')
        return
      }

      const handleRegex = /^[a-zA-Z0-9_-]+$/
      if (!handleRegex.test(handle) || handle.length < 2 || handle.length > 50) {
        setHandleStatus('invalid')
        setHandleError('2–50 characters: letters, numbers, _ or -')
        return
      }

      setHandleStatus('checking')
      try {
        const response = await fetch(`/api/users/check-handle?handle=${encodeURIComponent(handle.toLowerCase())}`)
        const data = await response.json()

        if (data.available) {
          setHandleStatus('available')
          setHandleError('')
        } else {
          setHandleStatus('unavailable')
          setHandleError('This handle is already taken')
        }
      } catch {
        setHandleStatus('idle')
        setHandleError('Error checking availability')
      }
    }, 500),
    []
  )

  useEffect(() => {
    checkHandleAvailability(formData.handle)
  }, [formData.handle, checkHandleAvailability])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleLinkChange = (index: number, field: keyof NomadLink, value: string) => {
    setLinks((prev) => {
      const newLinks = [...prev]
      newLinks[index] = { ...newLinks[index], [field]: value }
      return newLinks
    })
  }

  const addLink = () => {
    if (links.length < 3) {
      setLinks([...links, { type: 'website', url: '' }])
    }
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.handle.trim() || handleStatus !== 'available') {
      showError('Please pick an available handle')
      return
    }
    if (!formData.display_name.trim()) {
      showError('Name is required')
      return
    }

    const validLinks = links.filter((link) => link.url.trim())
    if (validLinks.length > 3) {
      showError('Maximum 3 links allowed')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: formData.handle.trim().toLowerCase(),
          display_name: formData.display_name,
          bio: formData.bio || undefined,
          location: formData.current_city || undefined,
          avatar_url: formData.avatar_url || undefined,
          country: undefined,
          role: formData.role || undefined,
          hometown: formData.hometown || undefined,
          current_city: formData.current_city || undefined,
          work_status: formData.work_status,
          visited_countries: visitedCountries,
          profile_type: 'nomad',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create nomad card')
      }

      if (validLinks.length > 0) {
        await Promise.all(
          validLinks.map((link, index) =>
            fetch('/api/nomad-links', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: link.type,
                label: link.type === 'other' ? link.label : undefined,
                url: link.url,
                order_index: index,
              }),
            })
          )
        )
      }

      clearDraft()
      showSuccess('Card created! Redirecting…')
      setTimeout(() => {
        router.push(`/${formData.handle.trim().toLowerCase()}`)
      }, 1200)
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to create nomad card')
    } finally {
      setLoading(false)
    }
  }

  const canSubmit =
    !loading &&
    formData.handle.trim() &&
    handleStatus === 'available' &&
    formData.display_name.trim()

  return (
    <>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <div className="min-h-screen bg-white text-gray-900">
        <nav className="border-b border-gray-100 sticky top-0 bg-white/80 backdrop-blur z-50">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <Logo />
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition">
              Cancel
            </Link>
          </div>
        </nav>

        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <header className="mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
              Claim your card.
            </h1>
            <p className="text-gray-600">
              Three fields to start. Everything else is optional and editable later.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Essentials */}
            <div className="space-y-5">
              {/* Handle */}
              <div>
                <label htmlFor="handle" className="block text-sm font-medium text-gray-900 mb-1.5">
                  Handle <span className="text-gray-400">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-400 text-sm font-mono">nomad.now/</span>
                  </div>
                  <input
                    type="text"
                    id="handle"
                    name="handle"
                    value={formData.handle}
                    onChange={handleChange}
                    required
                    pattern="^[a-zA-Z0-9_-]+$"
                    maxLength={50}
                    autoFocus
                    className={`w-full pl-[6.25rem] pr-10 py-3 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm bg-white transition ${
                      handleStatus === 'available'
                        ? 'border-green-500 focus:ring-green-500/30'
                        : handleStatus === 'unavailable' || handleStatus === 'invalid'
                        ? 'border-red-500 focus:ring-red-500/30'
                        : 'border-gray-300 focus:ring-gray-900/15 focus:border-gray-900'
                    }`}
                    placeholder="yourhandle"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {handleStatus === 'checking' && <LoadingSpinner size="sm" />}
                    {handleStatus === 'available' && (
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {(handleStatus === 'unavailable' || handleStatus === 'invalid') && (
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                </div>
                {handleStatus === 'available' && (
                  <p className="mt-1.5 text-xs text-green-600">Available — claim it before someone else does</p>
                )}
                {(handleStatus === 'unavailable' || handleStatus === 'invalid') && (
                  <p className="mt-1.5 text-xs text-red-600">{handleError || 'Handle is not available'}</p>
                )}
                {handleStatus === 'idle' && (
                  <p className="mt-1.5 text-xs text-gray-500">Cannot be changed later.</p>
                )}
              </div>

              {/* Name */}
              <div>
                <label htmlFor="display_name" className="block text-sm font-medium text-gray-900 mb-1.5">
                  Name <span className="text-gray-400">*</span>
                </label>
                <input
                  type="text"
                  id="display_name"
                  name="display_name"
                  value={formData.display_name}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                  placeholder="Kenji Tanaka"
                />
              </div>

              {/* Current city */}
              <div>
                <label htmlFor="current_city" className="block text-sm font-medium text-gray-900 mb-1.5">
                  Currently in
                </label>
                <input
                  type="text"
                  id="current_city"
                  name="current_city"
                  value={formData.current_city}
                  onChange={handleChange}
                  maxLength={100}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                  placeholder="Bangkok"
                />
                <p className="mt-1.5 text-xs text-gray-500">Shown live on your card. Change when you move.</p>
              </div>
            </div>

            {/* Customize more — collapsible */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="group flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                aria-expanded={showMore}
                aria-controls="more-fields"
              >
                <svg
                  className={`w-4 h-4 transition ${showMore ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {showMore ? 'Hide extras' : 'Customize more (optional)'}
              </button>

              {showMore && (
                <div id="more-fields" className="mt-5 space-y-5 border-t border-gray-100 pt-6">
                  {/* Role + Work status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="role" className="block text-sm font-medium text-gray-900 mb-1.5">
                        Role
                      </label>
                      <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition bg-white text-base"
                      >
                        <option value="">—</option>
                        {ROLES.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="work_status" className="block text-sm font-medium text-gray-900 mb-1.5">
                        Status
                      </label>
                      <select
                        id="work_status"
                        name="work_status"
                        value={formData.work_status}
                        onChange={handleChange}
                        className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition bg-white text-base"
                      >
                        {WORK_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>{status.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-900 mb-1.5">
                      One-line bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      maxLength={200}
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 resize-none transition"
                      placeholder="Building tools for remote life."
                    />
                    <p className="mt-1 text-xs text-gray-400 text-right">{formData.bio.length}/200</p>
                  </div>

                  {/* Hometown */}
                  <div>
                    <label htmlFor="hometown" className="block text-sm font-medium text-gray-900 mb-1.5">
                      From
                    </label>
                    <input
                      type="text"
                      id="hometown"
                      name="hometown"
                      value={formData.hometown}
                      onChange={handleChange}
                      maxLength={100}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                      placeholder="Osaka"
                    />
                  </div>

                  {/* Avatar */}
                  <div>
                    <label htmlFor="avatar_url" className="block text-sm font-medium text-gray-900 mb-1.5">
                      Avatar URL
                    </label>
                    <input
                      type="url"
                      id="avatar_url"
                      name="avatar_url"
                      value={formData.avatar_url}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 transition text-base"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  {/* Links */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Links <span className="text-gray-400">(max 3)</span>
                    </label>
                    <div className="space-y-2">
                      {links.map((link, index) => (
                        <div key={index} className="flex gap-2">
                          <select
                            value={link.type}
                            onChange={(e) => handleLinkChange(index, 'type', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 bg-white"
                          >
                            {LINK_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {link.type === 'other' && (
                            <input
                              type="text"
                              placeholder="Label"
                              value={link.label || ''}
                              onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 flex-1"
                            />
                          )}
                          <input
                            type="url"
                            placeholder="https://…"
                            value={link.url}
                            onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900/15 focus:border-gray-900 flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeLink(index)}
                            className="px-2 py-2 text-gray-400 hover:text-red-600 transition"
                            aria-label="Remove link"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      {links.length < 3 && (
                        <button
                          type="button"
                          onClick={addLink}
                          className="text-sm text-gray-600 hover:text-gray-900 font-medium transition"
                        >
                          + Add link
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Visited countries */}
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1.5">
                      Countries you&apos;ve been to
                    </label>
                    <CountrySelector
                      selectedCountries={visitedCountries}
                      onChange={setVisitedCountries}
                    />
                    <p className="mt-1.5 text-xs text-gray-500">
                      Plotted on the map on your card. Add the rest later if you don&apos;t remember them all now.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="pt-4 sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pb-4 -mx-4 sm:-mx-6 px-4 sm:px-6">
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-gray-900 text-white px-6 py-4 rounded-full font-medium hover:bg-gray-800 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[52px]"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span>Claiming…</span>
                  </>
                ) : (
                  <>
                    <span>Claim my card</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">
                Free, no subscription. Cancel anytime by deleting your card.
              </p>
            </div>
          </form>
        </main>
      </div>
    </>
  )
}
