'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getReadableErrorMessage } from '@/lib/errorMessage';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    name?: string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error(`Uncaught error in ErrorBoundary (${this.props.name || 'Unknown'}):`, error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex h-full w-full items-center justify-center p-4">
                    <Card className="max-w-md w-full border-destructive/50 shadow-lg">
                        <CardHeader className="text-center space-y-2">
                            <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <CardTitle className="font-headline text-2xl text-destructive font-bold">Something went wrong</CardTitle>
                            <CardDescription>
                                We encountered an unexpected error in this part of the app.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 text-center">
                            {this.state.error && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {getReadableErrorMessage(
                                        this.state.error,
                                        'Something went wrong. Please try again.',
                                    )}
                                </p>
                            )}
                            <Button onClick={this.handleReset} className="w-full font-bold" variant="outline">
                                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
