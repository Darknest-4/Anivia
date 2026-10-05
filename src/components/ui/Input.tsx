import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export const inputClasses =
  'h-11 w-full rounded-lg border border-line bg-surface-2 px-3.5 text-sm text-fg placeholder:text-fg-subtle transition-colors duration-fast hover:border-line-strong focus:border-accent/70 focus:outline-none focus:ring-2 focus:ring-accent/25'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
  rightSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, leftIcon, rightSlot, ...rest }, ref) {
  if (!leftIcon && !rightSlot) return <input ref={ref} className={cn(inputClasses, className)} {...rest} />
  return (
    <div className="relative w-full">
      {leftIcon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle [&>svg]:h-4 [&>svg]:w-4">{leftIcon}</span>}
      <input ref={ref} className={cn(inputClasses, leftIcon && 'pl-10', rightSlot && 'pr-11', className)} {...rest} />
      {rightSlot && <span className="absolute right-1.5 top-1/2 -translate-y-1/2">{rightSlot}</span>}
    </div>
  )
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cn(inputClasses, 'h-auto min-h-[120px] py-3 leading-relaxed', className)} {...rest} />
})

interface FieldProps {
  label: string
  hint?: string
  error?: string
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode
  className?: string
  labelAside?: ReactNode
}

/** Accessible label + control + hint/error wrapper. */
export function Field({ label, hint, error, children, className, labelAside }: FieldProps) {
  const id = useId()
  const descId = hint || error ? `${id}-desc` : undefined
  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-fg">
          {label}
        </label>
        {labelAside}
      </div>
      {children({ id, 'aria-describedby': descId, 'aria-invalid': Boolean(error) || undefined })}
      {(error || hint) && (
        <p id={descId} className={cn('text-xs', error ? 'text-danger' : 'text-fg-subtle')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
