
"use client";

import { useEffect } from "react";
import { errorEmitter } from "@/firebase/error-emitter";
import { useToast } from "@/hooks/use-toast";

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (err) => {
      // Em vez de quebrar a aplicação (throw), usamos uma notificação toast amigável.
      // Isso mantém o usuário informado sem interromper o fluxo de navegação.
      toast({
        variant: "destructive",
        title: "Erro de Permissão",
        description: "Você não tem acesso a esses dados ou sua sessão expirou.",
      });
      console.error("Firestore Permission Denied:", err);
    });
    
    return () => unsubscribe();
  }, [toast]);

  return null; 
}
