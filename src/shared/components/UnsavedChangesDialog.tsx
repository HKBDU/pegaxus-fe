import { useEffect } from "react";
import { useBlocker, type Blocker } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

export interface DataRouterBlockerProps {
  shouldBlock: (args: { currentLocation: { pathname: string }; nextLocation: { pathname: string } }) => boolean;
  onChange: (blocker: Blocker) => void;
}

export function DataRouterBlocker({ shouldBlock, onChange }: DataRouterBlockerProps) {
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    onChange(blocker);
  }, [blocker, onChange]);

  return null;
}

export interface UnsavedChangesDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export function UnsavedChangesDialog({
  open,
  title = "Discard unsaved changes?",
  description = "You have unsaved changes that will be lost if you leave this page. Are you sure you want to leave?",
  onKeepEditing,
  onDiscard,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onKeepEditing(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepEditing}>
            Keep Editing
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDiscard}>
            Discard Changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

