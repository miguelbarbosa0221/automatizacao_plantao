"use client";

import { useEffect } from "react";
import { errorEmitter } from "@/firebase/error-emitter";
import { useToast } from "@/hooks/use-toast";

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = errorEmitter.on("permission-error", (error) => {
      console.error("🔒 Erro de Permissão Firestore:", error);
      
      // Em vez de 'throw', apenas avisamos o usuário via Toast
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Sua sessão pode ter expirado ou você não tem permissão para ver estes dados.",
      });
    });

    return () => unsubscribe();
  }, [toast]);

  return null; // Não renderiza nada, apenas escuta
}