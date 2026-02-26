'use client';

import { FileText, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DealDetail } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// CONTRACT SECTION COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ContractSectionProps {
  deal: DealDetail;
}

export function ContractSection({ deal }: ContractSectionProps) {
  const handleDownload = () => {
    if (deal.contractUrl) {
      window.open(deal.contractUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Document</CardTitle>
      </CardHeader>
      <CardContent>
        {/* PDF Viewer Placeholder */}
        <div className="bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] border border-[var(--border-color)] h-[500px] flex flex-col items-center justify-center">
          <FileText className="h-16 w-16 text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-primary)] font-medium mb-2">Contract Preview</p>
          <p className="text-sm text-[var(--text-muted)] mb-6 text-center max-w-md">
            The full contract document will be displayed here once the PDF viewer is integrated.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="ghost" onClick={handleDownload}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Please review the contract carefully before accepting. Contact our support team if you
            have any questions.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}

export default ContractSection;
