"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { TemplateSection } from "@/types/template";

interface TemplatePreviewProps {
    name: string;
    description?: string;
    sections: TemplateSection[];
    isVisible: boolean;
    onClose: () => void;
}

export function TemplatePreview({
    name,
    description,
    sections,
    isVisible,
    onClose,
}: TemplatePreviewProps) {
    const renderContentBlock = (block: any) => {
        if (block.type === 'text') {
            return <span key={block.id}>{block.content}</span>;
        } else {
            return (
                <span key={block.id} className="bg-primary/10 text-primary px-1 rounded font-mono text-sm">
                    {block.content}
                </span>
            );
        }
    };

    const renderSection = (section: TemplateSection) => (
        <div key={section.id} className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">{section.title}</h3>
            <div className="text-sm leading-relaxed text-muted-foreground">
                {section.content.map((block, index) => (
                    <span key={block.id}>
                        {renderContentBlock(block)}
                        {index < section.content.length - 1 && ' '}
                    </span>
                ))}
            </div>
        </div>
    );

    const getTemplateStats = () => {
        const totalSections = sections.length;
        const totalTextBlocks = sections.reduce((acc, section) =>
            acc + section.content.filter(block => block.type === 'text').length, 0
        );
        const totalVariables = sections.reduce((acc, section) =>
            acc + section.content.filter(block => block.type === 'variable').length, 0
        );
        const totalKMLFields = sections.reduce((acc, section) =>
            acc + section.content.filter(block => block.type === 'kml_variable').length, 0
        );

        return { totalSections, totalTextBlocks, totalVariables, totalKMLFields };
    };

    const stats = getTemplateStats();

    return (
        <>
            {/* Compact Preview */}
            <div className="space-y-4">
                <div className="space-y-2">
                    <h3 className="font-semibold">{name}</h3>
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">{stats.totalSections} sections</Badge>
                    <Badge variant="outline">{stats.totalTextBlocks} text blocks</Badge>
                    <Badge variant="default">{stats.totalVariables} variables</Badge>
                    {stats.totalKMLFields > 0 && (
                        <Badge variant="destructive">{stats.totalKMLFields} KML fields</Badge>
                    )}
                </div>

                {sections.length > 0 && (
                    <div className="space-y-3">
                        <Separator />
                        <div className="text-sm">
                            {sections.map(renderSection)}
                        </div>
                    </div>
                )}

                {sections.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No sections added yet
                    </div>
                )}
            </div>

            {/* Full Preview Dialog */}
            <Dialog open={isVisible} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>Template Preview</span>
                            <Button variant="ghost" size="sm" onClick={onClose}>
                                <X className="h-4 w-4" />
                            </Button>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="overflow-y-auto max-h-[60vh] pr-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>{name}</CardTitle>
                                {description && (
                                    <p className="text-muted-foreground">{description}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <Badge variant="secondary">{stats.totalSections} sections</Badge>
                                    <Badge variant="outline">{stats.totalTextBlocks} text blocks</Badge>
                                    <Badge variant="default">{stats.totalVariables} variables</Badge>
                                    {stats.totalKMLFields > 0 && (
                                        <Badge variant="destructive">{stats.totalKMLFields} KML fields</Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {sections.length > 0 ? (
                                    sections.map(renderSection)
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No sections added yet.</p>
                                        <p className="text-sm">Add sections to see the preview.</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
} 