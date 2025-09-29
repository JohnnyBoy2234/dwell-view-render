import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, FileText, AlertTriangle } from 'lucide-react';
import type { LeaseContractData, ClauseSection } from '@/types/lease';

interface ContractClausesProps {
  data: LeaseContractData;
  onUpdate: (updates: Partial<LeaseContractData>) => void;
}

const standardClauses: Omit<ClauseSection, 'id'>[] = [
  {
    title: 'Maintenance and Repairs',
    content: 'The tenant is responsible for minor maintenance (up to the amount specified in this agreement) and must promptly report defects. The landlord will attend to structural and major repairs within a reasonable time, subject to access being granted by the tenant.',
    isRequired: false,
    order: 1
  },
  {
    title: 'Property Inspection',
    content: 'The landlord (or agent) may inspect the premises on reasonable notice (not less than 24 hours), at reasonable times, to assess maintenance and compliance. In emergencies, access may be granted without prior notice where necessary to protect life or property.',
    isRequired: false,
    order: 2
  },
  {
    title: 'Early Termination',
    content: 'Either party may terminate early in accordance with applicable law by giving the required written notice. Early termination fees, if any, shall be limited to reasonable costs and losses actually incurred by the non‑terminating party.',
    isRequired: false,
    order: 3
  },
  {
    title: 'Property Damage',
    content: 'The tenant is liable for damage beyond fair wear and tear and must take reasonable care of the premises. Repair costs attributable to the tenant may be deducted from the deposit or recovered as permitted by law after providing an itemised statement.',
    isRequired: false,
    order: 4
  }
];

export function ContractClauses({ data, onUpdate }: ContractClausesProps) {
  const [newClause, setNewClause] = useState<Omit<ClauseSection, 'id'>>({
    title: '',
    content: '',
    isRequired: false,
    order: 0
  });

  const clauses = data.additionalClauses || [];

  const addClause = (clause?: Omit<ClauseSection, 'id'>) => {
    const clauseToAdd = clause || newClause;
    if (!clauseToAdd.title.trim() || !clauseToAdd.content.trim()) return;

    const newClauseWithId: ClauseSection = {
      ...clauseToAdd,
      id: crypto.randomUUID(),
      order: clauses.length + 1
    };

    onUpdate({
      additionalClauses: [...clauses, newClauseWithId]
    });

    if (!clause) {
      setNewClause({
        title: '',
        content: '',
        isRequired: false,
        order: 0
      });
    }
  };

  const removeClause = (clauseId: string) => {
    onUpdate({
      additionalClauses: clauses.filter(c => c.id !== clauseId)
    });
  };

  const updateClause = (clauseId: string, updates: Partial<ClauseSection>) => {
    onUpdate({
      additionalClauses: clauses.map(c => 
        c.id === clauseId ? { ...c, ...updates } : c
      )
    });
  };

  return (
    <div className="space-y-6">
      {/* Standard Clauses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Standard Clauses</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add commonly used lease clauses to your contract.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {standardClauses.map((clause, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{clause.title}</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addClause(clause)}
                    disabled={clauses.some(c => c.title === clause.title)}
                  >
                    {clauses.some(c => c.title === clause.title) ? 'Added' : 'Add Clause'}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{clause.content}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Clauses */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Custom Clauses</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add your own custom clauses and terms to the contract.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clauseTitle">Clause Title</Label>
              <Input
                id="clauseTitle"
                value={newClause.title}
                onChange={(e) => setNewClause({ ...newClause, title: e.target.value })}
                placeholder="e.g., Pet Policy, Noise Restrictions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clauseContent">Clause Content</Label>
              <Textarea
                id="clauseContent"
                value={newClause.content}
                onChange={(e) => setNewClause({ ...newClause, content: e.target.value })}
                placeholder="Enter the detailed terms and conditions for this clause..."
                rows={4}
              />
            </div>

            <Button
              onClick={() => addClause()}
              disabled={!newClause.title.trim() || !newClause.content.trim()}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Clause
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Added Clauses */}
      {clauses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Added Clauses ({clauses.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {clauses.map((clause) => (
              <div key={clause.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2">
                      <Input
                        value={clause.title}
                        onChange={(e) => updateClause(clause.id, { title: e.target.value })}
                        className="font-medium"
                      />
                      {clause.isRequired && (
                        <Badge variant="secondary">Required</Badge>
                      )}
                    </div>
                    <Textarea
                      value={clause.content}
                      onChange={(e) => updateClause(clause.id, { content: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeClause(clause.id)}
                    className="ml-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Legal Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-amber-900">Legal Notice</h4>
              <p className="text-sm text-amber-800">
                Custom clauses should be reviewed by a legal professional to ensure they comply with local rental laws and regulations. 
                SwiftRent provides templates for convenience but does not provide legal advice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        <p>Additional clauses are optional but can help clarify expectations and protect both parties.</p>
      </div>
    </div>
  );
}