import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { RotateCcw, Download, Trash2 } from 'lucide-react';
import { resetAndReload, clearAllStorage, exportAppData } from '@/lib/resetApp';
import { toast } from 'sonner';

export function ResetControls() {
  const [isResetting, setIsResetting] = useState(false);

  const handleExportData = () => {
    try {
      exportAppData();
      toast.success('App data exported successfully');
    } catch (error) {
      toast.error('Failed to export app data');
      console.error('Export error:', error);
    }
  };

  const handleClearStorage = async () => {
    try {
      clearAllStorage();
      toast.success('Storage cleared successfully');
    } catch (error) {
      toast.error('Failed to clear storage');
      console.error('Clear storage error:', error);
    }
  };

  const handleFullReset = async () => {
    setIsResetting(true);
    try {
      await resetAndReload();
    } catch (error) {
      toast.error('Failed to reset app');
      console.error('Reset error:', error);
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <RotateCcw className="h-5 w-5" />
          Reset & Data Management
        </CardTitle>
        <CardDescription>
          Export, clear, or reset application data. Use with caution.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export Data */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Export App Data</p>
            <p className="text-sm text-muted-foreground">
              Download a backup of your current app state
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        {/* Clear Storage */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Clear Storage</p>
            <p className="text-sm text-muted-foreground">
              Remove all locally stored data (requires sign in again)
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Storage?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all locally stored data including your session.
                  You will need to sign in again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearStorage}>
                  Clear Storage
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Full Reset */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="font-medium text-destructive">Full App Reset</p>
            <p className="text-sm text-muted-foreground">
              Reset everything and reload the app (clears cache, storage, service workers)
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                disabled={isResetting}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset App
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Entire Application?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all data, cache, and service workers, then reload the app.
                  This action cannot be undone. Make sure to export your data first if needed.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleFullReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isResetting ? 'Resetting...' : 'Reset & Reload'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
