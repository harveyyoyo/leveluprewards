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
    onSkip?: () => void;
    aspectRatio?: number;
    circularCrop?: boolean;
    freeform?: boolean;
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
            croppedCanvas.toBlob((file) => resolve(file), 'image/png');
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
        }, 'image/png');
    });
}

export function ImageCropper({ imageSrc, onCropComplete, onCancel, onSkip, aspectRatio, circularCrop = false, freeform = false }: ImageCropperProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [currentAspect, setCurrentAspect] = useState<number | undefined>(aspectRatio ?? (freeform ? 1 : undefined));

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
                    <DialogTitle>Crop Image</DialogTitle>
                </DialogHeader>
                <div className="relative w-full h-80 bg-black/5 rounded-lg overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={currentAspect}
                        cropShape={circularCrop ? "round" : "rect"}
                        showGrid={!circularCrop}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={setZoom}
                        restrictPosition={false}
                    />
                </div>
                {freeform && (
                    <div className="flex justify-center gap-2 pt-2">
                        <Button variant={currentAspect === 1 ? 'default' : 'outline'} size="sm" onClick={() => setCurrentAspect(1)}>Square</Button>
                        <Button variant={currentAspect === 4/3 ? 'default' : 'outline'} size="sm" onClick={() => setCurrentAspect(4/3)}>4:3 Landscape</Button>
                        <Button variant={currentAspect === 16/9 ? 'default' : 'outline'} size="sm" onClick={() => setCurrentAspect(16/9)}>16:9 Wide</Button>
                        <Button variant={currentAspect === 3/1 ? 'default' : 'outline'} size="sm" onClick={() => setCurrentAspect(3/1)}>3:1 Banner</Button>
                    </div>
                )}
                <div className="py-2">
                    <div className="text-sm font-medium mb-2">Zoom</div>
                    <Slider
                        value={[zoom]}
                        min={0.1}
                        max={3}
                        step={0.1}
                        onValueChange={(vals: number[]) => setZoom(vals[0])}
                    />
                </div>
                <DialogFooter className="flex justify-between sm:justify-between w-full">
                    <Button variant="outline" onClick={onCancel}>Cancel</Button>
                    <div className="flex gap-2">
                        {onSkip && <Button variant="secondary" onClick={onSkip}>Skip Cropping</Button>}
                        <Button onClick={handleSave}>Apply Crop</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
