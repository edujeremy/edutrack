import React from 'react'
import { cn } from '@/lib/utils'

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode
}

interface TableHeadProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

interface TableHeaderCellProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  onSort?: () => void
  children: React.ReactNode
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, children, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
      <table
        ref={ref}
        className={cn('w-full text-sm', className)}
        {...props}
      >
        {children}
      </table>
    </div>
  )
)
Table.displayName = 'Table'

export const TableHead = React.forwardRef<
  HTMLTableSectionElement,
  TableHeadProps
>(({ className, children, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn('bg-gray-50 border-b border-gray-200', className)}
    {...props}
  >
    {children}
  </thead>
))
TableHead.displayName = 'TableHead'

export const TableHeaderCell = React.forwardRef<
  HTMLTableCellElement,
  TableHeaderCellProps
>(({ className, sortable, onSort, children, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'px-6 py-3 text-left font-semibold text-gray-900',
      sortable && 'cursor-pointer hover:bg-gray-100',
      className
    )}
    onClick={onSort}
    {...props}
  >
    {children}
  </th>
))
TableHeaderCell.displayName = 'TableHeaderCell'

// Alias for backward compatibility
export const TableHead = TableHeaderCell
export const TableHeader = TableHead

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, children, ...props }, ref) => (
  <tbody ref={ref} className={className} {...props}>
    {children}
  </tbody>
))
TableBody.displayName = 'TableBody'

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, children, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-gray-200 hover:bg-gray-50 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  )
)
TableRow.displayName = 'TableRow'

export const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn('px-6 py-3 text-gray-700', className)}
      {...props}
    >
      {children}
    </td>
  )
)
TableCell.displayName = 'TableCell'
