import { TemplateBuilder } from "./_components/template-builder";

export default function CreateTemplatePage() {
    return (
        <div className="@container/main flex flex-col gap-4 md:gap-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Create Template</h1>
                <p className="text-muted-foreground">
                    Build a new report template with sections, static text, and variables.
                </p>
            </div>

            <TemplateBuilder />
        </div>
    );
} 