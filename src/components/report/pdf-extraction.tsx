"use client";

import { useRef } from "react";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface PdfExtractionProps {
    pdfExtractedValues: Record<string, string>;
    isExtractingPdf: boolean;
    onPdfSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onPdfDrop: (e: React.DragEvent<HTMLDivElement>) => Promise<void>;
}

export function PdfExtraction({ pdfExtractedValues, isExtractingPdf, onPdfSelect, onPdfDrop }: PdfExtractionProps) {
    const pdfInputRef = useRef<HTMLInputElement | null>(null);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Upload Instructions PDF</CardTitle>
                <CardDescription>
                    Extract values from an Instructions PDF and save it to the report.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={onPdfSelect} />
                {Object.keys(pdfExtractedValues).length === 0 && (
                    <div
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={onPdfDrop}
                        className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer"
                        onClick={() => pdfInputRef.current?.click()}
                    >
                        {isExtractingPdf ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <p className="text-sm text-muted-foreground">Extracting values from PDF...</p>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">Drop PDF here or click to select</p>
                        )}
                    </div>
                )}
                {Object.keys(pdfExtractedValues).length > 0 && (
                    <div className="mt-4 p-4 bg-muted rounded-md">
                        <div className="text-sm">
                            <div className="text-muted-foreground mb-2">Extracted Values:</div>
                            <div className="space-y-1">
                                {Object.entries(pdfExtractedValues).map(([label, value]) => (
                                    <div key={label} className="pl-2">
                                        <span className="font-medium">{label}:</span>{' '}
                                        <span className="break-words">{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {Object.keys(pdfExtractedValues).length > 0 && (
                    <div className="mt-6">
                        <Button variant="outline" onClick={() => pdfInputRef.current?.click()} disabled={isExtractingPdf}>
                            Upload another PDF
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

