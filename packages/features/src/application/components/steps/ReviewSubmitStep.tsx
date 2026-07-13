import { Badge } from '@mzanzihomes/ui/components/badge';
import { Button } from '@mzanzihomes/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@mzanzihomes/ui/components/card';
import { Checkbox } from '@mzanzihomes/ui/components/checkbox';
import { Label } from '@mzanzihomes/ui/components/label';
import { Pencil } from 'lucide-react';
import { summaryGroups, type GroupStatus } from '../../summary';
import type { StepProps } from './shared';

const STATUS_BADGE: Record<GroupStatus, { label: string; className: string }> = {
  complete: { label: 'Complete', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  missing: { label: 'Missing information', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
  na: { label: 'Not applicable', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100' }
};

export const DECLARATION_TEXT =
  'I confirm that the information and documents I provided are true, complete and accurate to the best of my knowledge.';

interface ReviewSubmitStepProps extends StepProps {
  onEdit: (step: number) => void;
  declared: boolean;
  setDeclared: (v: boolean) => void;
}

/** Step 6: review every group, fix anything via Edit, then make the final
 * truth declaration — deliberately separate from the screening consent. */
export function ReviewSubmitStep({ data, errors, onEdit, declared, setDeclared }: ReviewSubmitStepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Review and submit</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Check each section below. Use Edit to fix anything before you submit.
        </p>
      </div>

      {summaryGroups(data).map((group) => {
        const badge = STATUS_BADGE[group.status];
        return (
          <Card key={group.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{group.title}</CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge className={badge.className}>{badge.label}</Badge>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(group.step)}>
                    <Pencil className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            {group.rows.length > 0 && (
              <CardContent className="space-y-1.5">
                {group.rows.map((r, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="text-muted-foreground">{r.label}: </span>
                    <span className="break-words">{r.value}</span>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Declaration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <Checkbox id="final_declaration" checked={declared} onCheckedChange={(c) => setDeclared(!!c)} />
            <Label htmlFor="final_declaration" className="text-sm leading-snug">
              {DECLARATION_TEXT} *
            </Label>
          </div>
          {errors.declaration && <p className="text-xs text-destructive mt-2">{errors.declaration}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
