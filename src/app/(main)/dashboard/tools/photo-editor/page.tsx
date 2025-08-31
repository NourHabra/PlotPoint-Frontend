"use client";

import React, { useState } from "react";

import ImageEditor from "@/components/image-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function PhotoEditorPage() {
    const [url, setUrl] = useState("");
    return (
        <div className="flex flex-col gap-4 md:gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Photo Editor</h1>
                <p className="text-muted-foreground">Crop, draw, and pixelate before upload.</p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Try it</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <Input placeholder="Paste image URL (optional)" value={url} onChange={(e) => setUrl(e.target.value)} />
                    </div>
                    <ImageEditor initialImageUrl={url || undefined} />
                </CardContent>
            </Card>
        </div>
    );
}

