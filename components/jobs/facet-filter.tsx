'use client';

import { PlusCircleIcon, XIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

export interface FacetOption<T extends string | number> {
  value: T;
  label: string;
  icon?: ReactNode;
  hint?: string;
}

/**
 * Multi-select facet (Linear-style): dashed trigger showing the selection, popover with a searchable checklist.
 */
export function FacetFilter<T extends string | number>({
  title,
  options,
  selected,
  onChange,
  searchable = false,
  maxBadges = 2,
}: {
  title: string;
  options: readonly FacetOption<T>[];
  selected: readonly T[];
  onChange: (next: T[]) => void;
  searchable?: boolean;
  maxBadges?: number;
}) {
  const chosen = options.filter((o) => selected.includes(o.value));
  const toggle = (v: T) =>
    onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn('border-dashed', chosen.length > 0 && 'border-solid bg-accent/60')}
          />
        }
      >
        <PlusCircleIcon className={cn(chosen.length > 0 && 'hidden')} />
        {title}
        {chosen.length > 0 ? (
          <>
            <Separator orientation="vertical" className="mx-0.5 h-3.5 data-vertical:self-center" />
            {chosen.length > maxBadges ? (
              <span className="rounded bg-background px-1 text-[11px] font-medium">
                {chosen.length} selected
              </span>
            ) : (
              chosen.map((o) => (
                <span
                  key={String(o.value)}
                  className="max-w-28 truncate rounded bg-background px-1 text-[11px] font-medium"
                >
                  {o.label}
                </span>
              ))
            )}
          </>
        ) : null}
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          {searchable ? <CommandInput placeholder={`Filter ${title.toLowerCase()}…`} /> : null}
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const isOn = selected.includes(o.value);
                return (
                  <CommandItem
                    key={String(o.value)}
                    value={`${o.label} ${o.value}`}
                    onSelect={() => toggle(o.value)}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-4 place-items-center rounded-[4px] border border-input text-[10px]',
                        isOn && 'border-primary bg-primary text-primary-foreground',
                      )}
                    >
                      {isOn ? '✓' : null}
                    </span>
                    {o.icon}
                    <span className="text-left truncate" dir="auto">
                      {o.label}
                      {isOn ? <span className="sr-only"> (selected)</span> : null}
                    </span>
                    {o.hint ? <span className="ml-auto text-xs text-muted-foreground">{o.hint}</span> : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selected.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={() => onChange([])} className="justify-center text-muted-foreground">
                    <XIcon />
                    Clear {title.toLowerCase()}
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
