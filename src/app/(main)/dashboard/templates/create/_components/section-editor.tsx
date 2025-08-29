"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, GripVertical, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { TemplateSection, ContentBlock } from "@/types/template";
import { ContentBlockEditor } from "./content-block-editor";

interface SectionEditorProps {
    section: TemplateSection;
    onUpdate: (section: Partial<TemplateSection>) => void;
    onDelete: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    onReorder?: (fromIndex: number, toIndex: number) => void;
    sectionIndex: number;
    isFirst: boolean;
    isLast: boolean;
}

export function SectionEditor({
    section,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    onReorder,
    sectionIndex,
    isFirst,
    isLast,
}: SectionEditorProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [isDragging, setIsDragging] = useState(false);

    const addContentBlock = (type: 'text' | 'variable' | 'kml_variable') => {
        const newBlock: ContentBlock = {
            id: `block-${Date.now()}`,
            type,
            content: type === 'text' ? '' : type === 'variable' ? '{{variable_name}}' : '{{kml_field}}',
            variableName: type === 'variable' ? 'variable_name' : undefined,
            variableType: type === 'variable' ? 'string' : undefined,
            kmlField: type === 'kml_variable' ? 'municipality' : undefined,
        };

        onUpdate({
            content: [...section.content, newBlock],
        });
    };

    const updateContentBlock = (blockId: string, updatedBlock: Partial<ContentBlock>) => {
        const updatedContent = section.content.map(block =>
            block.id === blockId ? { ...block, ...updatedBlock } : block
        );
        onUpdate({ content: updatedContent });
    };

    const deleteContentBlock = (blockId: string) => {
        const updatedContent = section.content.filter(block => block.id !== blockId);
        onUpdate({ content: updatedContent });
    };

    const reorderContentBlocks = (fromIndex: number, toIndex: number) => {
        const newContent = [...section.content];
        const [movedBlock] = newContent.splice(fromIndex, 1);
        newContent.splice(toIndex, 0, movedBlock);
        onUpdate({ content: newContent });
    };

    const getSectionSummary = () => {
        const textBlocks = section.content.filter(block => block.type === 'text').length;
        const variableBlocks = section.content.filter(block => block.type === 'variable').length;
        const kmlBlocks = section.content.filter(block => block.type === 'kml_variable').length;
        return `${textBlocks} text, ${variableBlocks} variables, ${kmlBlocks} KML`;
    };

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        e.dataTransfer.setData('text/plain', sectionIndex.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = sectionIndex;

        if (fromIndex !== toIndex && onReorder) {
            onReorder(fromIndex, toIndex);
        }
    };

    const handleDragEnd = () => {
        setIsDragging(false);
    };

    return (
        <Card
            className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''}`}
            draggable
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
        >
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
                                title="Drag to reorder section"
                            >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" className="h-auto p-0 font-semibold">
                                    <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    {section.title || 'Untitled Section'}
                                </Button>
                            </CollapsibleTrigger>
                            <Badge variant="secondary" className="text-xs">
                                {getSectionSummary()}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                            {onMoveUp && (
                                <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={isFirst}>
                                    <ChevronUp className="h-4 w-4" />
                                </Button>
                            )}
                            {onMoveDown && (
                                <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast}>
                                    <ChevronDown className="h-4 w-4" />
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={onDelete}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        {/* Section Title */}
                        <div className="space-y-2">
                            <Label htmlFor={`section-title-${section.id}`}>Section Title</Label>
                            <Input
                                id={`section-title-${section.id}`}
                                value={section.title}
                                onChange={(e) => onUpdate({ title: e.target.value })}
                                placeholder="Enter section title"
                            />
                        </div>

                        <Separator />

                        {/* Content Blocks */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Content Blocks</Label>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addContentBlock('text')}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Text
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addContentBlock('variable')}
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Variable
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => addContentBlock('kml_variable')}
                                    >
                                        <MapPin className="h-3 w-3 mr-1" />
                                        Add KML Field
                                    </Button>
                                </div>
                            </div>

                            {section.content.length === 0 ? (
                                <div className="text-center py-4 text-muted-foreground text-sm">
                                    No content blocks added yet. Add text, variables, or KML fields to get started.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {section.content.map((block, index) => (
                                        <ContentBlockEditor
                                            key={block.id}
                                            block={block}
                                            onUpdate={(updatedBlock) => updateContentBlock(block.id, updatedBlock)}
                                            onDelete={() => deleteContentBlock(block.id)}
                                            onMoveUp={index > 0 ? () => reorderContentBlocks(index, index - 1) : undefined}
                                            onMoveDown={index < section.content.length - 1 ? () => reorderContentBlocks(index, index + 1) : undefined}
                                            isFirst={index === 0}
                                            isLast={index === section.content.length - 1}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Section Preview */}
                        {section.content.length > 0 && (
                            <>
                                <Separator />
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Section Preview</Label>
                                    <div className="p-3 bg-muted rounded-md text-sm">
                                        <div className="font-medium mb-2">{section.title}</div>
                                        <div className="space-y-1">
                                            {section.content.map((block) => (
                                                <span key={block.id}>
                                                    {block.type === 'text' ? (
                                                        block.content
                                                    ) : (
                                                        <span className="bg-primary/10 text-primary px-1 rounded">
                                                            {block.content}
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
} 