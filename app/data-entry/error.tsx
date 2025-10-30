'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DataEntryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Data entry error:', error);
  }, [error]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Daily Sales Data Entry</h1>
        <p className="text-muted-foreground mt-1">
          An error occurred while loading the data entry page
        </p>
      </div>

      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <CardTitle className="text-red-900">Unable to Load Data Entry</CardTitle>
              <CardDescription className="text-red-700">
                {error.message || 'An unexpected error occurred'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={reset} variant="default">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
