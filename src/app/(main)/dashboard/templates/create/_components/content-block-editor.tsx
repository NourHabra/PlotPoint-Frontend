"use client";

import { ChevronUp, ChevronDown, Trash2, Type, Hash, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KML_FIELD_OPTIONS, getKMLFieldLabel, getKMLFieldType } from "@/lib/kml-constants";
import { ContentBlock, KMLFieldType } from "@/types/template";

interface ContentBlockEditorProps {
    block: ContentBlock;
    onUpdate: (block: Partial<ContentBlock>) => void;
    onDelete: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    isFirst: boolean;
    isLast: boolean;
}

export function ContentBlockEditor({
    block,
    onUpdate,
    onDelete,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast,
}: ContentBlockEditorProps) {
    const isTextBlock = block.type === 'text';
    const isVariableBlock = block.type === 'variable';
    const isKMLBlock = block.type === 'kml_variable';

    const handleVariableNameChange = (variableName: string) => {
        onUpdate({
            variableName,
            content: `{{${variableName}}}` // Auto-generate display format
        });
    };

    const handleKMLFieldChange = (kmlField: KMLFieldType) => {
        const fieldType = getKMLFieldType(kmlField);
        onUpdate({
            kmlField,
            content: `{{${kmlField}}}`,
            variableType: fieldType
        });
    };

    const getBlockIcon = () => {
        if (isTextBlock) return <Type className="h-4 w-4 text-blue-500" />;
        if (isVariableBlock) return <Hash className="h-4 w-4 text-green-500" />;
        if (isKMLBlock) return <MapPin className="h-4 w-4 text-purple-500" />;
        return null;
    };

    const getBlockBadgeVariant = () => {
        if (isTextBlock) return "secondary";
        if (isVariableBlock) return "default";
        if (isKMLBlock) return "outline";
        return "secondary";
    };

    const getBlockLabel = () => {
        if (isTextBlock) return "Text";
        if (isVariableBlock) return "Variable";
        if (isKMLBlock) return "KML";
        return "Unknown";
    };

    return (
        <Card className="border-l-4 border-l-primary/20">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Block Type Indicator */}
                    <div className="flex items-center gap-2">
                        {getBlockIcon()}
                        <Badge variant={getBlockBadgeVariant()} className="text-xs">
                            {getBlockLabel()}
                        </Badge>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        {onMoveUp && (
                            <Button variant="ghost" size="sm" onClick={onMoveUp} disabled={isFirst}>
                                <ChevronUp className="h-3 w-3" />
                            </Button>
                        )}
                        {onMoveDown && (
                            <Button variant="ghost" size="sm" onClick={onMoveDown} disabled={isLast}>
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={onDelete}>
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                <div className="mt-4 space-y-4">
                    {isTextBlock ? (
                        /* Text Block Editor */
                        <div className="space-y-2">
                            <Label htmlFor={`text-content-${block.id}`}>Text Content</Label>
                            <Textarea
                                id={`text-content-${block.id}`}
                                value={block.content}
                                onChange={(e) => onUpdate({ content: e.target.value })}
                                placeholder="Enter your text content here..."
                                rows={3}
                            />
                        </div>
                    ) : isVariableBlock ? (
                        /* Variable Block Editor */
                        <div className="space-y-4">
                            {/* Variable Name */}
                            <div className="space-y-2">
                                <Label htmlFor={`variable-name-${block.id}`}>Variable Name</Label>
                                <Input
                                    id={`variable-name-${block.id}`}
                                    value={block.variableName || ''}
                                    onChange={(e) => handleVariableNameChange(e.target.value)}
                                    placeholder="e.g., property_location, area_size, price"
                                />
                            </div>

                            {/* Variable Type */}
                            <div className="space-y-2">
                                <Label htmlFor={`variable-type-${block.id}`}>Variable Type</Label>
                                <Select
                                    value={block.variableType || 'string'}
                                    onValueChange={(value: 'string' | 'number' | 'date' | 'currency') =>
                                        onUpdate({ variableType: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="string">Text</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="currency">Currency</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Admin text templates UI removed */}
                        </div>
                    ) : (
                        /* KML Variable Block Editor */
                        <div className="space-y-4">
                            {/* KML Field Selection */}
                            <div className="space-y-2">
                                <Label htmlFor={`kml-field-${block.id}`}>KML Field</Label>
                                <Select
                                    value={block.kmlField || 'municipality'}
                                    onValueChange={(value: KMLFieldType) => handleKMLFieldChange(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {KML_FIELD_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    This field will be populated from KML file data
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}