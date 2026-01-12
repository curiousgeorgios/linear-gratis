'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { X, Maximize2, ChevronDown } from 'lucide-react'

interface IssueCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: IssueFormData) => Promise<void>
  teamName?: string
  projectName?: string
  teamId?: string
  projectId?: string
  apiToken?: string
  viewSlug?: string
  defaultStateName?: string
}

interface IssueFormData {
  title: string
  description: string
  stateId?: string
  priority: number
  assigneeId?: string
  projectId?: string
  teamId?: string
  labelIds: string[]
}

interface WorkflowState {
  id: string
  name: string
  type: string
  color: string
  position: number
}

interface User {
  id: string
  name: string
  email: string
  displayName: string
  avatarUrl?: string
  active: boolean
}

interface Label {
  id: string
  name: string
  color: string
  description?: string
}

interface Metadata {
  states: WorkflowState[]
  users: User[]
  labels: Label[]
  triageEnabled?: boolean
  triageIssueState?: WorkflowState
}

const priorities = [
  { value: 0, label: 'No priority', icon: NoPriorityIcon },
  { value: 1, label: 'Low', icon: LowPriorityIcon },
  { value: 2, label: 'Medium', icon: MediumPriorityIcon },
  { value: 3, label: 'High', icon: HighPriorityIcon },
  { value: 4, label: 'Urgent', icon: UrgentPriorityIcon },
]

function NoPriorityIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="lch(64.892% 1.933 272 / 1)">
      <rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
      <rect x="6.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
      <rect x="11.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"></rect>
    </svg>
  )
}

function LowPriorityIcon() {
  return (
    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="11" width="3" height="3" rx="1" opacity="0.3"></rect>
      <rect x="11.5" y="11" width="3" height="3" rx="1" opacity="0.3"></rect>
    </svg>
  )
}

function MediumPriorityIcon() {
  return (
    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
      <rect x="11.5" y="11" width="3" height="3" rx="1" opacity="0.3"></rect>
    </svg>
  )
}

function HighPriorityIcon() {
  return (
    <svg className="w-4 h-4 text-orange-500" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1.5" y="8" width="3" height="6" rx="1"></rect>
      <rect x="6.5" y="5" width="3" height="9" rx="1"></rect>
      <rect x="11.5" y="2" width="3" height="12" rx="1"></rect>
    </svg>
  )
}

function UrgentPriorityIcon() {
  return (
    <svg className="w-4 h-4 text-red-500" viewBox="0 0 16 16" fill="currentColor">
      <path fillRule="evenodd" d="M3.741 14.5h8.521c1.691 0 2.778-1.795 1.993-3.293l-4.26-8.134c-.842-1.608-3.144-1.608-3.986 0l-4.26 8.134C.962 12.705 2.05 14.5 3.74 14.5ZM8 3.368a.742.742 0 0 0-.663.402l-4.26 8.134A.75.75 0 0 0 3.741 13H8V3.367Z" clipRule="evenodd"></path>
    </svg>
  )
}

function TodoIcon() {
  return (
    <svg aria-label="Todo" className="color-override color-override" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" rx="6" stroke="#e2e2e2" strokeWidth="1.5" fill="none"></rect>
      <path fill="#e2e2e2" stroke="none" d="M 3.5,3.5 L3.5,0 A3.5,3.5 0 0,1 3.5, 0 z" transform="translate(3.5,3.5)"></path>
    </svg>
  )
}



export function IssueCreationModal({
  isOpen,
  onClose,
  onSubmit,
  teamName,
  projectName,
  teamId,
  projectId,
  viewSlug,
  defaultStateName
}: IssueCreationModalProps) {
  const [formData, setFormData] = useState<IssueFormData>({
    title: '',
    description: '',
    priority: 0,
    labelIds: [],
    teamId,
    projectId,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [, setLoadingMetadata] = useState(false)
  const [selectedState, setSelectedState] = useState<WorkflowState | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<User | null>(null)
  const [selectedLabels, setSelectedLabels] = useState<Label[]>([])
  const [showStateDropdown, setShowStateDropdown] = useState(false)
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false)
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false)
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const titleRef = useRef<HTMLDivElement>(null)
  const descriptionRef = useRef<HTMLDivElement>(null)
  const stateDropdownRef = useRef<HTMLDivElement>(null)
  const priorityDropdownRef = useRef<HTMLDivElement>(null)
  const assigneeDropdownRef = useRef<HTMLDivElement>(null)
  const labelsDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && titleRef.current) {
      titleRef.current.focus()
    }
  }, [isOpen])


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node

      // Check each dropdown and close if click is outside
      if (showStateDropdown && stateDropdownRef.current && !stateDropdownRef.current.contains(target)) {
        setShowStateDropdown(false)
      }
      if (showPriorityDropdown && priorityDropdownRef.current && !priorityDropdownRef.current.contains(target)) {
        setShowPriorityDropdown(false)
      }
      if (showAssigneeDropdown && assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(target)) {
        setShowAssigneeDropdown(false)
      }
      if (showLabelsDropdown && labelsDropdownRef.current && !labelsDropdownRef.current.contains(target)) {
        setShowLabelsDropdown(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, showStateDropdown, showPriorityDropdown, showAssigneeDropdown, showLabelsDropdown])

  const loadMetadata = useCallback(async () => {
    if (!viewSlug) return

    setLoadingMetadata(true)
    try {
      const response = await fetch(`/api/public-view/${viewSlug}/metadata`)

      const data = await response.json() as { success?: boolean; metadata?: Metadata }
      if (data.success && data.metadata) {
        setMetadata(data.metadata)

        // Set default state
        // For public views, prioritise triage state if enabled
        let defaultState: WorkflowState | undefined

        if (data.metadata.triageEnabled && data.metadata.triageIssueState) {
          // Use triage state for public views when triage is enabled
          defaultState = data.metadata.triageIssueState
        } else if (data.metadata.states?.length > 0) {
          // If a default state name is provided (e.g. from Kanban column), try to find it
          // Note: This is overridden by backend for public views anyway
          if (defaultStateName) {
            defaultState = data.metadata.states.find((s: WorkflowState) => s.name === defaultStateName)
          }
          // Fall back to unstarted type or first state
          if (!defaultState) {
            defaultState = data.metadata.states.find((s: WorkflowState) => s.type === 'unstarted') || data.metadata.states[0]
          }
        }

        if (defaultState) {
          setSelectedState(defaultState)
          setFormData(prev => ({ ...prev, stateId: defaultState!.id }))
        }
      }
    } catch (error) {
      console.error('Failed to load metadata:', error)
    } finally {
      setLoadingMetadata(false)
    }
  }, [viewSlug, defaultStateName])

  useEffect(() => {
    if (isOpen && viewSlug) {
      loadMetadata()
    }
  }, [isOpen, viewSlug, loadMetadata])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    if (!viewSlug) {
      setError('View slug is required')
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const submitData = {
        ...formData,
        stateId: selectedState?.id,
        assigneeId: selectedAssignee?.id,
        labelIds: selectedLabels.map(label => label.id),
      }
      await onSubmit(submitData)
      onClose()
    } catch (error) {
      console.error('Failed to create issue:', error)
      setError(error instanceof Error ? error.message : 'Failed to create issue')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTitleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || ''
    setFormData(prev => ({ ...prev, title: text }))
  }

  const handleDescriptionInput = (e: React.FormEvent<HTMLDivElement>) => {
    const text = e.currentTarget.textContent || ''
    setFormData(prev => ({ ...prev, description: text }))
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      descriptionRef.current?.focus()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative z-[101] w-full max-w-3xl mx-4"
        style={{
          backgroundColor: 'lch(10.633 1.867 272)',
          border: '0.5px solid lch(24.833 4.707 272)',
          borderRadius: '8px',
          boxShadow: 'lch(0 0 0 / 0.15) 0px 4px 40px, lch(0 0 0 / 0.188) 0px 3px 20px, lch(0 0 0 / 0.188) 0px 3px 12px, lch(0 0 0 / 0.188) 0px 2px 8px, lch(0 0 0 / 0.188) 0px 1px 1px',
          maxWidth: isExpanded ? '750px' : '650px',
          color: 'lch(91.223 1.933 272)',
          transition: 'max-width 300ms cubic-bezier(0.43, 0.07, 0.59, 0.94)',
        }}
      >
        <div style={{ minHeight: '100px', width: '100%' }}>
          <form onSubmit={handleSubmit} className="w-full" tabIndex={-1}>
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b" style={{ borderColor: 'lch(24.833 4.707 272)' }}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 hover:bg-accent rounded transition-colors"
                  aria-label="Expand"
                >
                  <Maximize2 className="w-4 h-4" style={{ color: 'lch(64.892% 1.933 272 / 1)' }} />
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-accent rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" style={{ color: 'lch(64.892% 1.933 272 / 1)' }} />
              </button>
            </div>

            {/* Team and template selection */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'lch(24.833 4.707 272)' }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary/10 rounded flex items-center justify-center">
                  <span className="text-sm">💼</span>
                </div>
                <span className="font-medium text-sm">{teamName || projectName || 'Digital Nachos'}</span>
              </div>

            </div>

            {/* Error message */}
            {error && (
              <div className="px-4 py-2 border-b" style={{ borderColor: 'lch(24.833 4.707 272)' }}>
                <div className="text-red-500 text-sm">{error}</div>
              </div>
            )}

            {/* Title and description */}
            <div className="p-4">
              <style jsx>{`
                [contenteditable][data-placeholder]:empty:before {
                  content: attr(data-placeholder);
                  color: lch(64.892% 1.933 272 / 0.5);
                  pointer-events: none;
                }
              `}</style>
              <div className="mb-4">
                <div
                  ref={titleRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleTitleInput}
                  onKeyDown={handleTitleKeyDown}
                  className="w-full p-3 text-lg font-medium bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground"
                  style={{
                    minHeight: '44px',
                    fontFamily: 'var(--font-regular)',
                  }}
                  data-placeholder="Issue title"
                  onFocus={() => setError(null)}
                />
              </div>

              <div className="min-h-[120px]">
                <div
                  ref={descriptionRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleDescriptionInput}
                  className="w-full p-3 bg-transparent border-none outline-none resize-none text-foreground placeholder-muted-foreground"
                  style={{
                    minHeight: '80px',
                    lineHeight: '1.6',
                    fontFamily: 'var(--font-regular)',
                  }}
                  data-placeholder="Add description…"
                  onFocus={() => setError(null)}
                />
              </div>
            </div>

            {/* Issue properties */}
            <div className="flex items-center gap-2 px-4 py-3 border-t flex-wrap" style={{ borderColor: 'lch(24.833 4.707 272)' }}>
              {/* Status - Hidden for public views, interactive for authenticated users */}
              {!viewSlug && (
                <div className="relative" ref={stateDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowStateDropdown(!showStateDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                    style={{
                      border: '0.5px solid lch(24.833 4.707 272)',
                      backgroundColor: 'lch(8.3 1.867 272)',
                    }}
                  >
                    {selectedState ? (
                      <>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: selectedState.color }}
                        />
                        <span>{selectedState.name}</span>
                      </>
                    ) : (
                      <>
                        <TodoIcon />
                        <span>Status</span>
                      </>
                    )}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>

                  {showStateDropdown && metadata?.states && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[200px]"
                      style={{
                        backgroundColor: 'lch(10.633 1.867 272)',
                        border: '0.5px solid lch(24.833 4.707 272)',
                      }}
                    >
                      {metadata.states.map((state) => (
                        <button
                          key={state.id}
                          type="button"
                          onClick={() => {
                            setSelectedState(state)
                            setFormData(prev => ({ ...prev, stateId: state.id }))
                            setShowStateDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: state.color }}
                          />
                          <span>{state.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Priority - Hidden for public views */}
              {!viewSlug && (
                <div className="relative" ref={priorityDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowPriorityDropdown(!showPriorityDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                    style={{
                      border: '0.5px solid lch(24.833 4.707 272)',
                      backgroundColor: 'lch(8.3 1.867 272)',
                    }}
                  >
                    {React.createElement(priorities[formData.priority].icon)}
                    <span>{priorities[formData.priority].label}</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>

                  {showPriorityDropdown && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[150px]"
                      style={{
                        backgroundColor: 'lch(10.633 1.867 272)',
                        border: '0.5px solid lch(24.833 4.707 272)',
                      }}
                    >
                      {priorities.map((priority) => (
                        <button
                          key={priority.value}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, priority: priority.value }))
                            setShowPriorityDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                        >
                          {React.createElement(priority.icon)}
                          <span>{priority.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Assignee - Hidden for public views */}
              {!viewSlug && (
                <div className="relative" ref={assigneeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                    style={{
                      border: '0.5px solid lch(24.833 4.707 272)',
                      backgroundColor: 'lch(8.3 1.867 272)',
                    }}
                  >
                    {selectedAssignee ? (
                      <>
                        {selectedAssignee.avatarUrl ? (
                          <Image
                            src={selectedAssignee.avatarUrl}
                            alt={selectedAssignee.displayName}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {selectedAssignee.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </div>
                        )}
                        <span>{selectedAssignee.displayName}</span>
                      </>
                    ) : (
                      <>
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs">?</span>
                        </div>
                        <span>Assignee</span>
                      </>
                    )}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>

                  {showAssigneeDropdown && metadata?.users && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto"
                      style={{
                        backgroundColor: 'lch(10.633 1.867 272)',
                        border: '0.5px solid lch(24.833 4.707 272)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssignee(null)
                          setFormData(prev => ({ ...prev, assigneeId: undefined }))
                          setShowAssigneeDropdown(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors border-b"
                        style={{ borderColor: 'lch(24.833 4.707 272)' }}
                      >
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                          <span className="text-xs">?</span>
                        </div>
                        <span>Unassigned</span>
                      </button>
                      {metadata.users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedAssignee(user)
                            setFormData(prev => ({ ...prev, assigneeId: user.id }))
                            setShowAssigneeDropdown(false)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                        >
                          {user.avatarUrl ? (
                            <Image
                              src={user.avatarUrl}
                              alt={user.displayName}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              {user.displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                          )}
                          <span>{user.displayName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {/* Labels - Hidden for public views */}
              {!viewSlug && (
                <div className="relative" ref={labelsDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowLabelsDropdown(!showLabelsDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent transition-colors"
                    style={{
                      border: '0.5px solid lch(24.833 4.707 272)',
                      backgroundColor: 'lch(8.3 1.867 272)',
                    }}
                  >
                    {selectedLabels.length > 0 ? (
                      <>
                        <div className="flex gap-1">
                          {selectedLabels.slice(0, 2).map((label) => (
                            <div
                              key={label.id}
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: label.color }}
                            />
                          ))}
                          {selectedLabels.length > 2 && (
                            <span className="text-xs">+{selectedLabels.length - 2}</span>
                          )}
                        </div>
                        <span>Labels</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M12 11.5V13H5.132v-1.5H12Zm1.5-1.5V6a1.5 1.5 0 0 0-1.346-1.492L12 4.5H5.133a.5.5 0 0 0-.303.103l-.08.076-2.382 2.834a.5.5 0 0 0-.11.234l-.008.087v.331a.5.5 0 0 0 .118.321l2.382 2.835a.5.5 0 0 0 .383.179V13l-.22-.012a2 2 0 0 1-1.16-.54l-.15-.16L1.218 9.45a2 2 0 0 1-.46-1.11L.75 8.165v-.331a2 2 0 0 1 .363-1.147l.106-.14 2.383-2.834a2 2 0 0 1 1.312-.701L5.134 3H12a3 3 0 0 1 3 3v4a3 3 0 0 1-3.002 3v-1.5c.778 0 1.417-.59 1.494-1.347L13.5 10Z"></path>
                          <path d="M5.5 8a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"></path>
                        </svg>
                        <span>Labels</span>
                      </>
                    )}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </button>

                  {showLabelsDropdown && metadata?.labels && (
                    <div
                      className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg z-50 min-w-[200px] max-h-60 overflow-y-auto"
                      style={{
                        backgroundColor: 'lch(10.633 1.867 272)',
                        border: '0.5px solid lch(24.833 4.707 272)',
                      }}
                    >
                      {metadata.labels.map((label) => {
                        const isSelected = selectedLabels.some(l => l.id === label.id)
                        return (
                          <button
                            key={label.id}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                const newLabels = selectedLabels.filter(l => l.id !== label.id)
                                setSelectedLabels(newLabels)
                                setFormData(prev => ({ ...prev, labelIds: newLabels.map(l => l.id) }))
                              } else {
                                const newLabels = [...selectedLabels, label]
                                setSelectedLabels(newLabels)
                                setFormData(prev => ({ ...prev, labelIds: newLabels.map(l => l.id) }))
                              }
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${
                              isSelected ? 'bg-accent/50' : ''
                            }`}
                          >
                            <div
                              className="w-3 h-3 rounded-sm"
                              style={{ backgroundColor: label.color }}
                            />
                            <span>{label.name}</span>
                            {isSelected && <span className="ml-auto text-xs">✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}


            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-4 py-3 border-t" style={{ borderColor: 'lch(24.833 4.707 272)' }}>
              <Button
                type="submit"
                disabled={!formData.title.trim() || isSubmitting}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSubmitting ? 'Creating...' : 'Create issue'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}