"use client";

import React, { useEffect, useRef, useState } from "react";

import { Pen, Crop as CropIcon, RotateCcw, Grid } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
//

export type ImageEditorTool = "crop" | "draw" | "pixelate";

interface ImageEditorProps {
    initialImageUrl?: string;
    onExportBlob?: (blob: Blob) => void;
    exposeRef?: (api: { exportBlob: (cb: (blob: Blob) => void) => void; reset: () => void }) => void;
    maxDimension?: number; // max width/height for working canvas
}

export function ImageEditor({ initialImageUrl, onExportBlob, exposeRef, maxDimension = 1200 }: ImageEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const workRef = useRef<HTMLCanvasElement | null>(null); // offscreen working canvas
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [tool, setTool] = useState<ImageEditorTool>("draw");
    const [isPointerDown, setIsPointerDown] = useState(false);
    const [startPt, setStartPt] = useState<{ x: number; y: number } | null>(null);
    const [currPt, setCurrPt] = useState<{ x: number; y: number } | null>(null);
    const [brushSize, setBrushSize] = useState<number>(6);
    const [brushColor, setBrushColor] = useState<string>("#ff0000");
    const [pixelSize] = useState<number>(16);
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);
    const historyRef = useRef<Array<{ data: ImageData; width: number; height: number }>>([]);
    const [canUndo, setCanUndo] = useState<boolean>(false);

    useEffect(() => {
        workRef.current = document.createElement("canvas");
        if (initialImageUrl) {
            void loadImageFromUrl(initialImageUrl);
        }
        if (exposeRef) {
            exposeRef({
                exportBlob: (cb) => {
                    const canvas = workRef.current;
                    if (!canvas) return;
                    canvas.toBlob((blob) => {
                        if (blob) cb(blob);
                    }, "image/png", 0.92);
                },
                reset: () => {
                    if (imgRef.current) {
                        setupCanvasForImage(imgRef.current);
                        redraw();
                        // snapshot reset as a state change? don't push to history on reset
                    }
                },
            });
        }

    }, []);

    useEffect(() => {
        if (initialImageUrl) {
            void loadImageFromUrl(initialImageUrl);
        }

    }, [initialImageUrl]);

    const loadImageFromUrl = async (url: string) => {
        try {
            const img = new Image();
            if (/^https?:\/\//i.test(url)) {
                img.crossOrigin = "anonymous";
            }
            await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (e) => reject(e);
                img.src = url;
            });
            imgRef.current = img;
            setupCanvasForImage(img);
            setImageLoaded(true);
            // reset undo history for new image
            historyRef.current = [];
            setCanUndo(false);
            redraw();
        } catch {
            toast.error("Failed to load image");
        }
    };

    const setupCanvasForImage = (img: HTMLImageElement) => {
        const work = workRef.current!;
        const canvas = canvasRef.current!;
        const container = canvas.parentElement as HTMLElement | null;
        const containerW = Math.max(1, container ? container.clientWidth : maxDimension);
        const containerH = Math.max(1, container ? container.clientHeight : maxDimension);

        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        // Contain-fit: scale the image to fit entirely within the container area, no cropping
        const scale = Math.min(
            1,
            maxDimension / Math.max(imgW, imgH),
            containerW / imgW,
            containerH / imgH
        );
        const drawW = Math.max(1, Math.round(imgW * scale));
        const drawH = Math.max(1, Math.round(imgH * scale));

        // Size canvas exactly to the scaled image to avoid overflow
        work.width = drawW;
        work.height = drawH;
        canvas.width = drawW;
        canvas.height = drawH;

        const wctx = work.getContext("2d", { willReadFrequently: true })!;
        wctx.clearRect(0, 0, drawW, drawH);
        wctx.drawImage(img, 0, 0, drawW, drawH);
    };

    const redraw = (overlayOnly = false) => {
        const canvas = canvasRef.current;
        const work = workRef.current;
        if (!canvas || !work) return;
        const ctx = canvas.getContext("2d")!;
        if (!overlayOnly) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(work, 0, 0);
        }
        if (tool === "crop" && startPt && currPt) {
            ctx.save();
            ctx.strokeStyle = "#4f46e5";
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            const { x, y, w, h } = rectFromPoints(startPt, currPt);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        }
        if (tool === "pixelate" && startPt && currPt) {
            ctx.save();
            ctx.strokeStyle = "#0ea5e9";
            ctx.setLineDash([6, 4]);
            ctx.lineWidth = 2;
            const { x, y, w, h } = rectFromPoints(startPt, currPt);
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        }
    };

    const rectFromPoints = (a: { x: number; y: number }, b: { x: number; y: number }) => {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const w = Math.abs(a.x - b.x);
        const h = Math.abs(a.y - b.y);
        return { x, y, w, h };
    };

    const pushHistory = () => {
        const work = workRef.current;
        if (!work) return;
        const wctx = work.getContext("2d");
        if (!wctx) return;
        try {
            const snap = wctx.getImageData(0, 0, work.width, work.height);
            historyRef.current.push({ data: snap, width: work.width, height: work.height });
            setCanUndo(historyRef.current.length > 0);
        } catch {
            // ignore snapshot errors
        }
    };

    const handleUndo = () => {
        const work = workRef.current;
        const canvas = canvasRef.current;
        if (!work || !canvas) return;
        const wctx = work.getContext("2d");
        if (!wctx) return;
        const snap = historyRef.current.pop();
        if (!snap) return;
        // restore canvas size and pixels
        work.width = snap.width;
        work.height = snap.height;
        wctx.putImageData(snap.data, 0, 0);
        canvas.width = snap.width;
        canvas.height = snap.height;
        setCanUndo(historyRef.current.length > 0);
        redraw();
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!imageLoaded) return;
        const pt = getCanvasPoint(e);
        setIsPointerDown(true);
        setStartPt(pt);
        setCurrPt(pt);
        if (tool === "draw") {
            // snapshot before drawing stroke
            pushHistory();
            const work = workRef.current!;
            const wctx = work.getContext("2d")!;
            wctx.strokeStyle = brushColor;
            wctx.lineWidth = brushSize;
            wctx.lineCap = "round";
            wctx.lineJoin = "round";
            wctx.beginPath();
            wctx.moveTo(pt.x, pt.y);
        }
        redraw();
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isPointerDown || !imageLoaded) return;
        const pt = getCanvasPoint(e);
        setCurrPt(pt);
        if (tool === "draw") {
            const work = workRef.current!;
            const wctx = work.getContext("2d")!;
            wctx.lineTo(pt.x, pt.y);
            wctx.stroke();
            redraw();
        } else {
            redraw();
        }
    };

    const handlePointerUp = () => {
        if (!isPointerDown) return;
        setIsPointerDown(false);
        if (tool === "crop" && startPt && currPt) {
            applyCrop(rectFromPoints(startPt, currPt));
        }
        if (tool === "pixelate" && startPt && currPt) {
            applyPixelate(rectFromPoints(startPt, currPt));
        }
        setStartPt(null);
        setCurrPt(null);
        redraw();
    };

    const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = e.target as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        return { x, y };
    };

    const applyCrop = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => {
        if (w < 4 || h < 4) return;
        pushHistory();
        const work = workRef.current!;
        const next = document.createElement("canvas");
        next.width = Math.round(w);
        next.height = Math.round(h);
        const nctx = next.getContext("2d")!;
        nctx.drawImage(work, x, y, w, h, 0, 0, w, h);
        work.width = next.width;
        work.height = next.height;
        work.getContext("2d")!.drawImage(next, 0, 0);
        const canvas = canvasRef.current!;
        canvas.width = work.width;
        canvas.height = work.height;
        redraw();
    };

    const applyPixelate = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => {
        if (w < 2 || h < 2) return;
        pushHistory();
        const work = workRef.current!;
        const wctx = work.getContext("2d")!;
        const temp = document.createElement("canvas");
        const px = Math.max(2, Math.floor(pixelSize));
        temp.width = Math.max(1, Math.round(w / px));
        temp.height = Math.max(1, Math.round(h / px));
        const tctx = temp.getContext("2d")!;
        // Downscale
        tctx.imageSmoothingEnabled = false;
        tctx.clearRect(0, 0, temp.width, temp.height);
        tctx.drawImage(work, x, y, w, h, 0, 0, temp.width, temp.height);
        // Upscale back
        wctx.imageSmoothingEnabled = false;
        wctx.clearRect(x, y, w, h);
        wctx.drawImage(temp, 0, 0, temp.width, temp.height, x, y, w, h);
        wctx.imageSmoothingEnabled = true;
        redraw();
    };

    // Export/Upload controlled by parent modal; no internal file IO

    return (
        <div className="flex flex-col gap-3 h-full">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={tool === "draw" ? "default" : "outline"} size="sm" onClick={() => setTool("draw")} aria-label="Draw">
                                    <Pen className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Draw</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={tool === "pixelate" ? "default" : "outline"} size="sm" onClick={() => setTool("pixelate")} aria-label="Pixelate">
                                    <Grid className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Pixelate</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={tool === "crop" ? "default" : "outline"} size="sm" onClick={() => setTool("crop")} aria-label="Crop">
                                    <CropIcon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Crop</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <div className="flex items-center gap-2 ml-2">
                    <label className="text-sm text-muted-foreground">Brush</label>
                    <Slider className="w-32" value={[brushSize]} min={1} max={48} step={1} onValueChange={(v) => setBrushSize(v[0])} />
                    <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} />
                </div>
                {/* Pixel size slider removed */}
                <div className="ml-auto flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div>
                                    <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo || !imageLoaded} aria-label="Undo">
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Undo</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>

            <div className="relative border rounded-md overflow-hidden w-full flex-1 flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    className="max-w-full max-h-full touch-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                />
            </div>
        </div>
    );
}

export default ImageEditor;
