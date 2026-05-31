'use client';

import { useEffect } from 'react';

interface GoogleFontLoaderProps {
    fontFamily?: string;
}

export function GoogleFontLoader({ fontFamily }: GoogleFontLoaderProps) {
    useEffect(() => {
        if (!fontFamily || fontFamily === 'inherit' || fontFamily === 'sans-serif') {
            return;
        }

        // Replace spaces with + for the URL
        const fontName = fontFamily.replace(/\s+/g, '+');
        const linkId = `google-font-${fontName.toLowerCase()}`;

        // Check if the link already exists
        if (document.getElementById(linkId)) {
            return;
        }

        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName}:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap`;

        document.head.appendChild(link);

        return () => {
            // Optional: Cleanup if needed, but usually better to keep it cached
            // document.head.removeChild(link);
        };
    }, [fontFamily]);

    return null;
}
