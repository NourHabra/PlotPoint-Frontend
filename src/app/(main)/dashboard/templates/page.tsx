"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Filter, MoreHorizontal, Edit, Copy, Trash2, Eye, FileText, Loader2, RotateCcw, FileEdit } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { templateApi, ApiError } from "@/lib/api";
import { Template } from "@/types/template";

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const data = await templateApi.getAll(true); // Always include inactive templates
            setTemplates(data);
        } catch (error) {
            if (error instanceof ApiError) {
                toast.error(`Failed to load templates: ${error.message}`);
            } else {
                toast.error("Failed to load templates");
            }
            console.error("Error loading templates:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTemplate = async (templateId: string) => {
        try {
            await templateApi.delete(templateId);
            toast.success("Template deleted successfully");
            loadTemplates(); // Reload the list
        } catch (error) {
            if (error instanceof ApiError) {
                toast.error(`Failed to delete template: ${error.message}`);
            } else {
                toast.error("Failed to delete template");
            }
            console.error("Error deleting template:", error);
        }
    };

    const handleReactivateTemplate = async (templateId: string) => {
        try {
            await templateApi.reactivate(templateId);
            toast.success("Template reactivated successfully");
            loadTemplates(); // Reload the list
        } catch (error) {
            if (error instanceof ApiError) {
                toast.error(`Failed to reactivate template: ${error.message}`);
            } else {
                toast.error("Failed to reactivate template");
            }
            console.error("Error reactivating template:", error);
        }
    };

    const getTemplateStats = (template: Template) => {
        // Prefer imported variables if present
        if (template.variables && template.variables.length > 0) {
            return { sections: template.sections?.length || 0, textBlocks: 0, variables: template.variables.length };
        }
        const sections = template.sections?.length || 0;
        let textBlocks = 0;
        let variables = 0;

        (template.sections || []).forEach(section => {
            section.content.forEach(block => {
                if (block.type === 'text') textBlocks++;
                else if (block.type === 'variable' || block.type === 'kml_variable') variables++;
            });
        });

        return { sections, textBlocks, variables };
    };

    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const activeTemplates = filteredTemplates.filter(template => template.isActive);
    const inactiveTemplates = filteredTemplates.filter(template => !template.isActive);
    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
                <p className="text-muted-foreground">
                    Manage your report templates and create new ones.
                </p>
            </div>

            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            className="pl-8 w-[300px]"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/templates/import">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Template
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Loading templates...</span>
                    </div>
                </div>
            )}

            {/* Templates Grid */}
            {!loading && (
                <div className="space-y-8">
                    {/* Active Templates */}
                    {activeTemplates.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4">Active Templates</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {activeTemplates.map((template) => {
                                    const stats = getTemplateStats(template);
                                    return (
                                        <Card key={template._id || template.id} className="group hover:shadow-md transition-shadow h-full flex flex-col">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <CardTitle className="text-lg">{template.name}</CardTitle>
                                                        <CardDescription className="line-clamp-2">
                                                            {template.description}
                                                        </CardDescription>
                                                        <div>
                                                            <Badge variant="secondary" className="text-xs">{stats.variables} variables</Badge>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div>
                                                                            <DropdownMenuItem disabled>
                                                                                <Eye className="h-4 w-4 mr-2" />
                                                                                View
                                                                            </DropdownMenuItem>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Coming soon</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div>
                                                                            <DropdownMenuItem disabled>
                                                                                <Edit className="h-4 w-4 mr-2" />
                                                                                Edit
                                                                            </DropdownMenuItem>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Coming soon</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div>
                                                                            <DropdownMenuItem disabled>
                                                                                <Copy className="h-4 w-4 mr-2" />
                                                                                Duplicate
                                                                            </DropdownMenuItem>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>Coming soon</TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                            <DropdownMenuItem
                                                                className="text-destructive"
                                                                onClick={() => handleDeleteTemplate(String(template._id || template.id))}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 mt-auto">




                                                <Separator />

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                                                    <div className="flex gap-2">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <Button variant="outline" size="sm" disabled>
                                                                            <Eye className="h-3 w-3 mr-1" />
                                                                            Preview
                                                                        </Button>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Coming soon</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Inactive Templates */}
                    {inactiveTemplates.length > 0 && (
                        <div>
                            <h2 className="text-xl font-semibold mb-4 text-muted-foreground">Inactive Templates</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {inactiveTemplates.map((template) => {
                                    const stats = getTemplateStats(template);
                                    return (
                                        <Card key={template._id || template.id} className="group hover:shadow-md transition-shadow opacity-75 h-full flex flex-col">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div className="space-y-1">
                                                        <CardTitle className="text-lg">{template.name}</CardTitle>
                                                        <CardDescription className="line-clamp-2">
                                                            {template.description}
                                                        </CardDescription>
                                                        <div>
                                                            <Badge variant="secondary" className="text-xs">{stats.variables} variables</Badge>
                                                        </div>
                                                    </div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem>
                                                                <Eye className="h-4 w-4 mr-2" />
                                                                View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <Edit className="h-4 w-4 mr-2" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <Copy className="h-4 w-4 mr-2" />
                                                                Duplicate
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleReactivateTemplate(String(template._id || template.id))}
                                                            >
                                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                                Reactivate
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-4 mt-auto">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="destructive">Inactive</Badge>
                                                </div>



                                                <Separator />

                                                {/* Footer */}
                                                <div className="flex items-center justify-between text-sm text-muted-foreground">
                                                    <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                                                    <div className="flex gap-2">
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div>
                                                                        <Button variant="outline" size="sm" disabled>
                                                                            <Eye className="h-3 w-3 mr-1" />
                                                                            Preview
                                                                        </Button>
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Coming soon</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleReactivateTemplate(String(template._id || template.id))}
                                                        >
                                                            <RotateCcw className="h-3 w-3 mr-1" />
                                                            Reactivate
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredTemplates.length === 0 && (
                <Card className="text-center py-12">
                    <CardContent>
                        <div className="space-y-4">
                            <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                                <FileText className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">
                                    {searchTerm ? 'No templates found' : 'No templates yet'}
                                </h3>
                                <p className="text-muted-foreground">
                                    {searchTerm
                                        ? 'Try adjusting your search terms or create a new template.'
                                        : 'Create your first template to get started with report generation.'
                                    }
                                </p>
                            </div>
                            <Link href="/dashboard/templates/import">
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Template
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 