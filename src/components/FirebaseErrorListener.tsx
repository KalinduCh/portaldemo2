// src/components/FirebaseErrorListener.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import type { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  useEffect(() => {
    const handleError = (permissionError: FirestorePermissionError) => {
      console.error("Caught a Firestore permission error:", permissionError);
      setError(permissionError);
    };

    errorEmitter.on('permission-error', handleError);

    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []);

  // This will throw the error to be caught by Next.js's development error overlay
  if (error) {
    throw error;
  }

  return null;
}
