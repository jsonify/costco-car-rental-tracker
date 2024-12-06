// src/components/ui/alert.tsx
"use client"

import { AlertCircle } from "lucide-react"

interface AlertProps {
  variant?: 'default' | 'destructive'
  children: React.ReactNode
  className?: string
}

export function Alert({ 
  variant = 'default', 
  children, 
  className = '' 
}: AlertProps) {
  const baseStyles = "flex gap-4 rounded-lg border p-4 text-sm"
  const variantStyles = variant === 'destructive' 
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-blue-200 bg-blue-50 text-blue-700"

  return (
    <div className={`${baseStyles} ${variantStyles} ${className}`} role="alert">
      <div className="flex gap-2">
        <AlertCircle className="h-4 w-4" />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}

export function AlertDescription({ children }: { children: React.ReactNode }) {
  return <div className="text-sm">{children}</div>
}