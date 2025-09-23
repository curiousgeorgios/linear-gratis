'use client'

import React from 'react'

interface CheckboxProps {
  checked: boolean
  onChange: () => void
  onClick?: (e: React.MouseEvent) => void
  tabIndex?: number
}

export function Checkbox({ checked, onChange, onClick, tabIndex = -1 }: CheckboxProps) {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        width: '16px',
        height: '16px',
        zIndex: 1,
        opacity: 1,
        boxSizing: 'border-box',
        touchAction: 'pan-x pan-y',
        fontFamily: 'var(--font-regular)',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        lineHeight: 'inherit',
        verticalAlign: 'baseline',
        border: 0,
        margin: 0,
        padding: 0,
        cursor: 'var(--pointer, "default")',
        userSelect: 'none',
        color: 'lch(100 0 272)',
        WebkitTapHighlightColor: 'transparent',
        WebkitFontSmoothing: 'antialiased',
        textRendering: 'optimizeLegibility',
        WebkitTextSizeAdjust: '100%'
      }}
      onClick={(e) => {
        onChange()
        onClick?.(e)
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        onClick={onClick}
        tabIndex={tabIndex}
        style={{
          appearance: 'none',
          backgroundColor: 'transparent',
          flexShrink: 0,
          height: '14px',
          width: '14px',
          padding: '2px',
          verticalAlign: 'middle',
          transition: '80ms ease-out',
          fillOpacity: 0,
          border: '1px solid lch(20.573 4.707 272)',
          borderRadius: '3px',
          backgroundPosition: '1px 2px',
          boxShadow: 'none',
          margin: '0px',
          position: 'relative',
          cursor: 'var(--pointer)',
          fontFamily: 'var(--font-regular)',
          background: checked ? 'lch(47.918% 59.303 288.421)' : 'transparent',
          borderColor: checked ? 'lch(47.918% 59.303 288.421)' : 'lch(20.573 4.707 272)'
        }}
      />
      {checked && (
        <svg
          style={{
            position: 'absolute',
            width: '10px',
            height: '10px',
            pointerEvents: 'none'
          }}
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M13.5 4.5L6 12l-3.5-3.5L4 7l2 2 6-6 1.5 1.5z"
            fill="white"
            fillRule="evenodd"
          />
        </svg>
      )}
    </div>
  )
}