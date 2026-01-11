"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface KmlUploadProps {
    hasKmlData: boolean;
    kmlData: Record<string, any>;
    onKmlSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onKmlDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void>;
}

export function KmlUpload({ hasKmlData, kmlData, onKmlSelect, onKmlDrop }: KmlUploadProps) {
    const kmlInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload KML</CardTitle>
                <CardDescription>
                    {hasKmlData
                        ? 'KML data found for this report. Review below or replace it by uploading another file.'
                        : 'Drag and drop a .kml file or click to select. Extracted details will be saved to this report.'}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <input ref={kmlInputRef} type="file" accept=".kml" className="hidden" onChange={onKmlSelect} />
                {!hasKmlData && (
                    <div
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={onKmlDrop}
                        className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer"
                        onClick={() => kmlInputRef.current?.click()}
                    >
                        <p className="text-sm text-muted-foreground">Drop KML here or click to select</p>
                    </div>
                )}
                {hasKmlData && (
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(kmlData).map(([k, v]) => (
                            <div key={k} className="text-sm"><span className="text-muted-foreground">{k}:</span> <span className="font-medium break-words">{String(v || '')}</span></div>
                        ))}
                    </div>
                )}
                {hasKmlData && (
                    <div className="mt-6">
                        <Button variant="outline" onClick={() => kmlInputRef.current?.click()}>Upload another KML</Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

