"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { changelogApi, ApiError } from "@/lib/api";

export default function Page() {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [list, setList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        try {
            setLoading(true);
            const items = await changelogApi.list();
            setList(Array.isArray(items) ? items : []);
        } catch {
            setList([]);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); }, []);

    const submit = async () => {
        if (!title.trim() || !description.trim() || !date) return toast.error('Please fill all fields');
        try {
            setSaving(true);
            await changelogApi.create({ title: title.trim(), description: description.trim(), date });
            toast.success('Changelog entry created');
            setTitle("");
            setDescription("");
            setDate(new Date().toISOString().slice(0, 10));
            await load();
        } catch (e) {
            if (e instanceof ApiError) toast.error(e.message); else toast.error('Failed to create entry');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4">
            <Card>
                <CardHeader>
                    <CardTitle>Create Changelog Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-sm text-muted-foreground">Title</label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What changed?" />
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground">Description</label>
                        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Describe the change..." />
                    </div>
                    <div>
                        <label className="text-sm text-muted-foreground">Date</label>
                        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div className="flex justify-end">
                        <Button disabled={saving} onClick={submit}>{saving ? 'Saving...' : 'Save'}</Button>
                    </div>
                </CardContent>
            </Card>
            <div className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>All Entries</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {list.map((it) => (
                                <ChangelogRow key={String(it._id)} item={it} onChanged={load} />
                            ))}
                            {(!list || list.length === 0) && (
                                <div className="text-sm text-muted-foreground">No entries yet.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function ChangelogRow({ item, onChanged }: { item: any; onChanged: () => Promise<void> | void }) {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState<string>(item.title || "");
    const [description, setDescription] = useState<string>(item.description || "");
    const [date, setDate] = useState<string>(new Date(item.date).toISOString().slice(0, 10));
    const [saving, setSaving] = useState(false);
    const [disabled, setDisabled] = useState<boolean>(!!item.disabled);

    const save = async () => {
        try {
            setSaving(true);
            await changelogApi.update(String(item._id), { title, description, date, disabled });
            setEditing(false);
            await onChanged();
            toast.success('Saved');
        } catch (e) {
            if (e instanceof ApiError) toast.error(e.message); else toast.error('Save failed');
        } finally {
            setSaving(false);
        }
    };
    const del = async () => {
        try {
            setSaving(true);
            await changelogApi.delete(String(item._id));
            await onChanged();
            toast.success('Deleted');
        } catch (e) {
            if (e instanceof ApiError) toast.error(e.message); else toast.error('Delete failed');
        } finally {
            setSaving(false);
        }
    };

    if (!editing) {
        return (
            <div className="border rounded-md p-3">
                <div className="flex items-center justify-between">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(item.date).toLocaleDateString()}</div>
                </div>
                <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line">{item.description}</div>
                <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                    <Button variant="destructive" size="sm" disabled={saving} onClick={del}>Delete</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="border rounded-md p-3 space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea value={description} rows={4} onChange={(e) => setDescription(e.target.value)} />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Disable</label>
                <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
            </div>
            <div className="flex gap-2 mt-2">
                <Button size="sm" disabled={saving} onClick={save}>{saving ? 'Saving...' : 'Save'}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
        </div>
    );
}

