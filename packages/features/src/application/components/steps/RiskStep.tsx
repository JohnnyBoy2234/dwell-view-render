import { Label } from '@mzanzihomes/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@mzanzihomes/ui/components/radio-group';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { RISK_QUESTIONS } from '@mzanzihomes/common/constants/applicationConstants';
import { FieldError, type StepProps } from './shared';

export function RiskStep({ data, update, errors }: StepProps) {
  const answers = data.risk.answers;

  const setAnswer = (id: string, patch: Partial<{ answer: 'yes' | 'no' | ''; explanation: string }>) =>
    update('risk', {
      answers: {
        ...answers,
        [id]: { ...({ answer: '', explanation: '' } as const), ...answers[id], ...patch }
      }
    });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Additional Questions</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Please answer each question honestly. A Yes answer does not automatically affect your
          application — it simply gives the landlord context.
        </p>
      </div>

      {RISK_QUESTIONS.map((q) => {
        const a = answers[q.id];
        return (
          <div key={q.id} className="border rounded-lg p-4 space-y-3">
            <Label className="text-sm leading-snug">{q.question} *</Label>
            <RadioGroup
              className="flex gap-6"
              value={a?.answer || ''}
              onValueChange={(v) => setAnswer(q.id, { answer: v as 'yes' | 'no' })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`${q.id}_yes`} />
                <Label htmlFor={`${q.id}_yes`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`${q.id}_no`} />
                <Label htmlFor={`${q.id}_no`}>No</Label>
              </div>
            </RadioGroup>
            <FieldError error={errors[q.id]} />
            {a?.answer === 'yes' && (
              <div>
                <Label htmlFor={`${q.id}_explanation`} className="text-xs text-muted-foreground">
                  Please explain *
                </Label>
                <Textarea
                  id={`${q.id}_explanation`}
                  value={a.explanation}
                  onChange={(e) => setAnswer(q.id, { explanation: e.target.value })}
                />
                <FieldError error={errors[`${q.id}_explanation`]} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
