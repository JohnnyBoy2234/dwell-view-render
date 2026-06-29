import React from 'react';
import { Label } from '@mzanzihomes/ui/components/label';
import { RadioGroup, RadioGroupItem } from '@mzanzihomes/ui/components/radio-group';
import { Textarea } from '@mzanzihomes/ui/components/textarea';
import { Input } from '@mzanzihomes/ui/components/input';
import type { LeaseWizardData, ConditionAnswer, ConditionReportAnswers, StepValidationResult } from '@mzanzihomes/common/types/lease';
import { CONDITION_QUESTIONS } from '@/templates/conditionReportTemplate';
import { Alert, AlertDescription } from '@mzanzihomes/ui/components/alert';
import { AlertTriangle } from 'lucide-react';

interface Step08Props {
  data: LeaseWizardData;
  onUpdate: (updates: Partial<LeaseWizardData>) => void;
}

export function Step08ConditionReport({ data, onUpdate }: Step08Props) {
  const updateCondition = (key: string, value: ConditionAnswer | string) => {
    onUpdate({
      conditionReport: { ...data.conditionReport, [key]: value }
    });
  };

  const applicableQuestions = CONDITION_QUESTIONS.filter(q => {
    if (q.requiresFeature === 'hasPool' && !data.hasPool) return false;
    if (q.requiresFeature === 'hasAlarmSecurity' && !data.hasAlarmSecurity) return false;
    return true;
  });

  const hasYesAnswers = Object.entries(data.conditionReport).some(
    ([key, value]) => key !== 'comments' && key !== 's27_yearsResided' && value === 'yes'
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Property Condition Report</h2>
        <p className="text-sm text-muted-foreground">
          Complete this disclosure as required by the Property Practitioners Act.
        </p>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {applicableQuestions.map((q) => (
          <div key={q.id} className="p-4 border rounded-lg space-y-2">
            <Label className="font-medium text-sm">{q.id}. {q.question}</Label>
            {q.isYearsQuestion ? (
              <Input
                type="text"
                value={(data.conditionReport as any)[q.key] || ''}
                onChange={(e) => updateCondition(q.key, e.target.value)}
                placeholder="Enter number of years"
                className="max-w-xs"
              />
            ) : (
              <RadioGroup
                value={(data.conditionReport as any)[q.key]}
                onValueChange={(v) => updateCondition(q.key, v as ConditionAnswer)}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`${q.key}-yes`} />
                  <Label htmlFor={`${q.key}-yes`}>Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`${q.key}-no`} />
                  <Label htmlFor={`${q.key}-no`}>No</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="na" id={`${q.key}-na`} />
                  <Label htmlFor={`${q.key}-na`}>N/A</Label>
                </div>
              </RadioGroup>
            )}
          </div>
        ))}
      </div>

      {hasYesAnswers && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You answered "Yes" to one or more questions. Please provide details below.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="comments" className="font-medium">Comments (required if any "Yes" answers)</Label>
        <Textarea
          id="comments"
          value={data.conditionReport.comments}
          onChange={(e) => updateCondition('comments', e.target.value)}
          placeholder="Provide details for any 'Yes' answers..."
          rows={4}
        />
      </div>
    </div>
  );
}

export function validateStep08(data: LeaseWizardData): StepValidationResult {
  const errors: string[] = [];
  const hasYes = Object.entries(data.conditionReport).some(
    ([key, value]) => key !== 'comments' && key !== 's27_yearsResided' && value === 'yes'
  );
  if (hasYes && !data.conditionReport.comments?.trim()) {
    errors.push('Please provide comments for your "Yes" answers');
  }
  return { isValid: errors.length === 0, errors };
}
