"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { TemplateSection, ContentBlock } from "@/types/template";
import { SectionEditor } from "./section-editor";
import { TemplatePreview } from "./template-preview";
import { templateApi, ApiError } from "@/lib/api";

const templateFormSchema = z.object({
    name: z.string().min(1, "Template name is required"),
    description: z.string().optional(),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

// Category removed

export function TemplateBuilder() {
    const [sections, setSections] = useState<TemplateSection[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(templateFormSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    const addSection = () => {
        const newSection: TemplateSection = {
            id: `section-${Date.now()}`,
            title: `Section ${sections.length + 1}`,
            content: [],
            order: sections.length,
        };
        setSections([...sections, newSection]);
    };

    const updateSection = (sectionId: string, updatedSection: Partial<TemplateSection>) => {
        setSections(sections.map(section =>
            section.id === sectionId ? { ...section, ...updatedSection } : section
        ));
    };

    const deleteSection = (sectionId: string) => {
        setSections(sections.filter(section => section.id !== sectionId));
    };

    const reorderSections = (fromIndex: number, toIndex: number) => {
        const newSections = [...sections];
        const [movedSection] = newSections.splice(fromIndex, 1);
        newSections.splice(toIndex, 0, movedSection);

        // Update order property
        const updatedSections = newSections.map((section, index) => ({
            ...section,
            order: index,
        }));

        setSections(updatedSections);
    };

    const onSubmit = async (data: TemplateFormValues) => {
        if (sections.length === 0) {
            toast.error("Please add at least one section to your template");
            return;
        }

        setIsSaving(true);
        try {
            const templateData = {
                name: data.name,
                description: data.description,
                sections: sections,
                createdBy: "admin", // TODO: Replace with actual user ID from auth
            };

            const savedTemplate = await templateApi.create(templateData);
            console.log("Template saved:", savedTemplate);

            toast.success("Template saved successfully!");

            // Reset form
            form.reset();
            setSections([]);
        } catch (error) {
            if (error instanceof ApiError) {
                toast.error(`Failed to save template: ${error.message}`);
            } else {
                toast.error("Failed to save template");
            }
            console.error("Error saving template:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = () => {
        form.reset();
        setSections([]);
        toast.success("Form reset successfully");
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Builder Area */}
            <div className="lg:col-span-2 space-y-6">
                {/* Template Basic Info */}
                <Card>
                    <CardHeader>
                        <CardTitle>Template Information</CardTitle>
                        <CardDescription>
                            Define the basic information for your template
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Template Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="Enter template name"
                                    {...form.register("name")}
                                />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Describe the purpose of this template"
                                {...form.register("description")}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Sections */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Sections</CardTitle>
                                <CardDescription>
                                    Add sections to organize your template content
                                </CardDescription>
                            </div>
                            <Button onClick={addSection} size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Add Section
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {sections.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <p>No sections added yet.</p>
                                <p className="text-sm">Click "Add Section" to get started.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {sections.map((section, index) => (
                                    <SectionEditor
                                        key={section.id}
                                        section={section}
                                        sectionIndex={index}
                                        onUpdate={(updatedSection) => updateSection(section.id, updatedSection)}
                                        onDelete={() => deleteSection(section.id)}
                                        onMoveUp={index > 0 ? () => reorderSections(index, index - 1) : undefined}
                                        onMoveDown={index < sections.length - 1 ? () => reorderSections(index, index + 1) : undefined}
                                        onReorder={reorderSections}
                                        isFirst={index === 0}
                                        isLast={index === sections.length - 1}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Reset
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reset Template</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to reset the form? This will clear all template information and sections. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleReset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Reset Template
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    <Button onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? "Saving..." : "Save Template"}
                    </Button>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
                <Card className="sticky top-6">
                    <CardHeader>
                        <CardTitle>Template Preview</CardTitle>
                        <CardDescription>
                            See how your template will look
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TemplatePreview
                            name={form.watch("name") || "Untitled Template"}
                            description={form.watch("description")}
                            sections={sections}
                            isVisible={false}
                            onClose={() => { }}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 