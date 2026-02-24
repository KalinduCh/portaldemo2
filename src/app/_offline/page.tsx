
// src/app/_offline/page.tsx
import React from 'react';
import { WifiOff } from 'lucide-react';
import Image from 'next/image';

export default function OfflinePage() {
    const logoUrl = "https://i.imgur.com/aRktweQ.png";

    return (
        <div className="flex h-screen w-screen flex-col items-center justify-center p-4 text-center bg-background text-foreground">
            <div className="flex flex-col items-center justify-center gap-4">
                <WifiOff className="h-16 w-16 text-destructive" />
                <h1 className="text-3xl font-bold font-headline mt-4">You're Offline</h1>
                <p className="text-muted-foreground max-w-sm">
                    It looks like you've lost your internet connection. This app has limited functionality while offline. Please reconnect to access all features.
                </p>
                <div className="mt-8 flex items-center space-x-2 text-muted-foreground">
                    <Image
                        src={logoUrl}
                        alt="LEO Portal Logo"
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-sm"
                        data-ai-hint="club logo"
                    />
                    <h2 className="text-xl font-bold font-headline">LEO Portal</h2>
                </div>
            </div>
        </div>
    );
}
