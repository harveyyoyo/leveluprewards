"use client";
import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';

interface Point {
    x: number;
    y: number;
}

interface Area {
    width: number;
    height: number;
    x: number;
    y: number;
}

interface ImageCropperProps {
    imageSrc: string;
    onCropComplete: (croppedImageBlob: Blob) => void;
    onCancel: () => void;
    aspectRatio?: number;
    title?: string;
    showSkip?: boolean;
    onSkip?: () => void;
}

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

/**
 * Returns a Blob containing the cropped and resized image.
 */
async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0,
    flip = { horizontal: false, vertical: false }
): Promise<Blob | null> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        return null;
    }

    const rotRad = (rotation * Math.PI) / 180;

    const { width: bBoxWidth, height: bBoxHeight } = (() => {
        if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
            return { width: image.height, height: image.width };
        }
        return {
            width:
                Math.abs(Math.cos(rotRad) * image.width) +
                Math.abs(Math.sin(rotRad) * image.height),
            height:
                Math.abs(Math.sin(rotRad) * image.width) +
                Math.abs(Math.cos(rotRad) * image.height),
        };
    })();

    canvas.width = bBoxWidth;
    canvas.height = bBoxHeight;

    ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
    ctx.rotate(rotRad);
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    const croppedCanvas = document.createElement('canvas');
    const croppedCtx = croppedCanvas.getContext('2d');

    if (!croppedCtx) {
        return null;
    }

    croppedCanvas.width = pixelCrop.width;
    croppedCanvas.height = pixelCrop.height;

    croppedCtx.drawImage(
        canvas,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // --- RESIZING LOGIC ---
    const MAX_DIMENSION = 400;
    let { width, height } = pixelCrop;

    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION) {
        return new Promise((resolve) => {
            croppedCanvas.toBlob((file) => resolve(file), 'image/jpeg', 0.9);
        });
    }

    if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
    } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
    }

    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = width;
    resizeCanvas.height = height;

    const resizeCtx = resizeCanvas.getContext('2d');
    if (!resizeCtx) {
        return null;
    }
    
    // Draw cropped image to resize canvas, which performs the scaling
    resizeCtx.drawImage(croppedCanvas, 0, 0, width, height);

    return new Promise((resolve, reject) => {
        resizeCanvas.toBlob((file) => {
            if (file) {
                resolve(file);
            } else {
                reject(new Error('Canvas to Blob conversion failed'));
            }
        }, 'image/jpeg', 0.9);
    });
}

export function ImageCropper({ 
  imageSrc, 
  onCropComplete, 
  onCancel, 
  aspectRatio: initialAspectRatio, 
  title = "Crop Image",
  showSkip = false,
  onSkip
}: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [aspect, setAspect] = useState<number | undefined>(initialAspectRatio);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

    const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
            if (croppedImageBlob) {
                onCropComplete(croppedImageBlob);
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <Dialog open={true} onOpenChange={(open) => {
            if (!open) onCancel();
        }}>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center pr-6">
                        <span>{title}</span>
                        {showSkip && (
                            <Button variant="ghost" size="sm" onClick={onSkip} className="h-8 text-xs font-bold uppercase tracking-tight text-muted-foreground hover:text-foreground">
                                Skip Crop
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-80 bg-black/5 rounded-lg overflow-hidden border">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspect}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={setZoom}
                        restrictPosition={false}
                    />
                </div>
                
                <div className="flex gap-2 py-4 border-b overflow-x-auto no-scrollbar">
                    <Button 
                      size="sm" 
                      variant={aspect === undefined ? "secondary" : "outline"}
                      onClick={() => setAspect(undefined)}
                      className="text-[10px] uppercase font-bold h-7 px-2"
                    >
                        Original
                    </Button>
                    <Button 
                      size="sm" 
                      variant={aspect === 1 ? "secondary" : "outline"}
                      onClick={() => setAspect(1)}
                      className="text-[10px] uppercase font-bold h-7 px-2"
                    >
                        1:1 Square
                    </Button>
                    <Button 
                      size="sm" 
                      variant={aspect === 16/9 ? "secondary" : "outline"}
                      onClick={() => setAspect(16/9)}
                      className="text-[10px] uppercase font-bold h-7 px-2"
                    >
                        16:9 Wide
                    </Button>
                    <Button 
                      size="sm" 
                      variant={aspect === 4/3 ? "secondary" : "outline"}
                      onClick={() => setAspect(4/3)}
                      className="text-[10px] uppercase font-bold h-7 px-2"
                    >
                        4:3 TV
                    </Button>
                </div>

                <div className="py-4">
                    <div className="text-sm font-medium mb-2 flex justify-between">
                      <span>Zoom</span>
                      <span className="text-xs text-muted-foreground">{(zoom * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                        value={[zoom]}
                        min={0.1}
                        max={3}
                        step={0.1}
                        onValueChange={(vals: number[]) => setZoom(vals[0])}
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button onClick={handleSave}>Confirm Crop</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
