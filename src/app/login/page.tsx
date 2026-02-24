
// src/app/login/page.tsx
"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { markUserAttendance } from "@/services/attendanceService";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading: authLoading, user } = useAuth();
  const { toast } = useToast();
  const [formLoading, setFormLoading] = React.useState(false);
  const [loginMessage, setLoginMessage] = React.useState<{type: 'error' | 'info', text: string} | null>(null);
  const logoUrl = "https://i.imgur.com/aRktweQ.png";
  const eventId = searchParams.get('eventId');

  React.useEffect(() => {
    // This effect handles redirection *after* the user state is confirmed.
    // It does not handle the initial login logic.
    if (user && !authLoading) {
      const destination = eventId ? `/dashboard` : "/dashboard"; // Always go to dashboard after attendance is marked.
      router.replace(destination);
    }
  }, [user, authLoading, router, eventId]);

  const handleSubmit = async (values: any) => {
    setFormLoading(true);
    setLoginMessage(null);
    const result = await login(values.email, values.password);
    
    if (result.success && result.user) {
        toast({ title: "Login Successful", description: `Welcome back, ${result.user.name}!` });
        
        // If an eventId is present in the URL, attempt to mark attendance automatically
        if (eventId) {
            try {
                toast({ title: "Marking Attendance...", description: "Please wait.", duration: 3000 });
                const attendanceResult = await markUserAttendance(eventId, result.user.id);
                if (attendanceResult.status === 'success' || attendanceResult.status === 'already_marked') {
                    toast({ title: "Attendance Marked", description: attendanceResult.message, duration: 5000 });
                } else {
                    toast({ title: "Attendance Error", description: attendanceResult.message, variant: "destructive", duration: 8000 });
                }
            } catch (error: any) {
                toast({ title: "Attendance Failed", description: error.message || "An unexpected error occurred while marking attendance.", variant: "destructive", duration: 8000 });
            }
        }

        // The useEffect hook will now handle the redirection to the dashboard.
        // setFormLoading will be false after redirection anyway, but good practice to keep it.
        setFormLoading(false);

    } else {
      if (result.reason === 'pending') {
          setLoginMessage({ 
              type: 'info', 
              text: 'Your account is awaiting admin approval. Please check back later or contact an administrator if you believe this is an error.' 
          });
      } else {
          setLoginMessage({ type: 'error', text: 'Invalid email or password. Please try again.' });
      }
      setFormLoading(false);
    }
  };
  
  if (authLoading || (user && !authLoading)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
       <div className="absolute top-8 left-8 flex items-center space-x-2 text-primary">
        <Image 
            src={logoUrl} 
            alt="LEO Portal Logo" 
            width={32} 
            height={32} 
            className="h-8 w-8 rounded-sm"
            data-ai-hint="club logo"
        />
        <h1 className="text-2xl font-bold font-headline">LEO Portal</h1>
      </div>
      <div className="w-full max-w-md space-y-4">
        {loginMessage && (
            <Alert variant={loginMessage.type === 'error' ? 'destructive' : 'default'} className={loginMessage.type === 'info' ? 'border-primary/20 bg-primary/5' : ''}>
                {loginMessage.type === 'error' ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <Info className="h-4 w-4 text-primary" />}
                <AlertTitle>{loginMessage.type === 'error' ? 'Login Failed' : 'Account Status'}</AlertTitle>
                <AlertDescription>{loginMessage.text}</AlertDescription>
            </Alert>
        )}
        <AuthForm mode="login" onSubmit={handleSubmit} loading={formLoading} />
      </div>
       <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
        <p>
          Visiting Leo?{" "}
          <Link href={`/visiting-leo${eventId ? `?eventId=${eventId}`: ''}`} className="font-medium text-primary hover:underline flex items-center justify-center">
            <UserCheck className="mr-1 h-4 w-4" /> Mark Your Attendance
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
