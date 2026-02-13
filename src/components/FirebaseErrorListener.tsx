'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

/**
 * An invisible component that listens for globally emitted 'permission-error' events.
 * Instead of throwing the error, it displays a friendly toast notification.
 */
export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Display a user-friendly toast instead of breaking the app
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "Você não tem acesso a esses dados ou sua sessão expirou."
      });
      
      // Log the detailed error to the console for debugging
      console.error("Firestore Permission Denied:", error);
    };

    // The typed emitter enforces that the callback for 'permission-error'
    // matches the expected payload type (FirestorePermissionError).
    errorEmitter.on('permission-error', handleError);

    // Unsubscribe on unmount to prevent memory leaks.
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  // This component renders nothing.
  return null;
}
