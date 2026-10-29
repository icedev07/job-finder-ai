import type { ReactNode } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

/** A titled card section used by settings/config pages. */
export function SectionCard({
  title,
  description,
  actions,
  footer,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      {children ? <CardContent className={cn('space-y-4', contentClassName)}>{children}</CardContent> : null}
      {footer ? <CardFooter className="flex flex-wrap justify-end gap-2">{footer}</CardFooter> : null}
    </Card>
  );
}
