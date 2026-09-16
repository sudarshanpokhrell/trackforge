import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { projectLabelsQuery } from '@/hooks/use-labels'
import type { LabelSummary } from '@/types/issues'
import { useQuery } from '@tanstack/react-query'
import { LabelDot } from './label-chip'

interface LabelPickerProps {
  projectId: number
  selected: number[]
  onToggle: (label: LabelSummary, checked: boolean) => void
  disabled?: boolean
  className?: string
  children: React.ReactNode
}

/** A menu of the project's labels; picking one toggles it and keeps the menu open. */
export function LabelPicker({
  projectId,
  selected,
  onToggle,
  disabled,
  className,
  children,
}: LabelPickerProps) {
  const { data: labels = [], isPending } = useQuery(projectLabelsQuery(projectId))

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type="button"
        disabled={disabled}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Labels</DropdownMenuLabel>
          {labels.map((label) => (
            <DropdownMenuCheckboxItem
              key={label.id}
              checked={selected.includes(label.id)}
              onCheckedChange={(checked) => onToggle(label, checked)}
              className="gap-2.5"
            >
              <LabelDot color={label.color} />
              <span className="truncate">{label.name}</span>
            </DropdownMenuCheckboxItem>
          ))}
          {!isPending && labels.length === 0 && (
            <p className="px-1.5 py-1 text-sm text-muted-foreground">
              No labels yet. Project admins add them on the project page.
            </p>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
