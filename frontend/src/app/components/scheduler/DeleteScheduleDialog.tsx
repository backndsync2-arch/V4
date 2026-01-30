import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

interface DeleteScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleName: string;
  onConfirm: () => void;
}

export function DeleteScheduleDialog({
  open,
  onOpenChange,
  scheduleName,
  onConfirm,
}: DeleteScheduleDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#1a1a1a] border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Delete Schedule</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            Are you sure you want to delete "{scheduleName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="bg-[#2a2a2a] border-white/10 text-gray-300 hover:bg-[#3a3a3a]">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

