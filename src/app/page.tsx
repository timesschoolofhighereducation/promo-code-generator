"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import styles from "./page.module.css";

type BlockType = "text" | "code" | "icon" | "image" | "divider" | "spacer";
type Align = "left" | "center" | "right";
type PositionMode =
  | "top-left"
  | "top-center"
  | "top-right"
  | "mid-left"
  | "mid-center"
  | "mid-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
type ExportFormat = "png" | "jpeg";

type BaseBlock = {
  id: string;
  type: BlockType;
  visible: boolean;
  posX: number;
  posY: number;
  opacity: number;
};
type TextBlock = BaseBlock & {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: Align;
  italic: boolean;
  letterSpacing: number;
};
type CodeBlock = BaseBlock & {
  type: "code";
  color: string;
  fontSize: number;
  fontWeight: string;
  align: Align;
};
type IconBlock = BaseBlock & {
  type: "icon";
  icon: string;
  size: number;
  align: Align;
};
type ImageBlock = BaseBlock & {
  type: "image";
  imgW: number;
  imgH: number;
  align: Align;
  dataUrl?: string;
  image?: HTMLImageElement;
};
type DividerBlock = BaseBlock & {
  type: "divider";
  color: string;
  thickness: number;
  margin: number;
};
type SpacerBlock = BaseBlock & { type: "spacer"; height: number };
type Block = TextBlock | CodeBlock | IconBlock | ImageBlock | DividerBlock | SpacerBlock;

type GeneratedItem = { code: string; blob: Blob; previewDataUrl: string; ext: "png" | "jpg" };

const uid = () => Math.random().toString(36).slice(2, 8);

const makeDefaultBlocks = (): Block[] => [
  { id: uid(), type: "icon", visible: true, icon: "★", size: 38, align: "left", posX: 0, posY: 0, opacity: 100 },
  {
    id: uid(),
    type: "text",
    visible: true,
    text: "USE PROMOTION CODE",
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
    align: "left",
    italic: false,
    letterSpacing: 2,
    posX: 0,
    posY: 0,
    opacity: 100,
  },
  { id: uid(), type: "code", visible: true, color: "#FFD700", fontSize: 36, fontWeight: "800", align: "left", posX: 0, posY: 0, opacity: 100 },
  { id: uid(), type: "divider", visible: true, color: "rgba(255,255,255,0.25)", thickness: 1, margin: 7, posX: 0, posY: 0, opacity: 100 },
];

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blockImgInputRef = useRef<HTMLInputElement>(null);
  const stampBgInputRef = useRef<HTMLInputElement>(null);
  const editCanvasRef = useRef<HTMLCanvasElement>(null);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [editedImageData, setEditedImageData] = useState<ImageData | null>(null);
  const [blocks, setBlocks] = useState<Block[]>(makeDefaultBlocks);
  const [selectedPos, setSelectedPos] = useState<PositionMode>("bottom-left");
  const [zoom, setZoom] = useState(100);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [stampScale, setStampScale] = useState(100);
  const [stampRotation, setStampRotation] = useState(0);
  const [prefix, setPrefix] = useState("PROMO");
  const [separator, setSeparator] = useState("");
  const [rangeFrom, setRangeFrom] = useState(1);
  const [rangeTo, setRangeTo] = useState(10);
  const [bgStyle, setBgStyle] = useState("gradient");
  const [bgColor1, setBgColor1] = useState("#cc1111");
  const [bgColor2, setBgColor2] = useState("#880000");
  const [stampBgImage, setStampBgImage] = useState<HTMLImageElement | null>(null);
  const [stampBgDataUrl, setStampBgDataUrl] = useState<string>("");
  const [bgGradDir, setBgGradDir] = useState(135);
  const [bgRadius, setBgRadius] = useState(10);
  const [bgPadding, setBgPadding] = useState(18);
  const [bgOpacity, setBgOpacity] = useState(95);
  const [borderColor, setBorderColor] = useState("#ff4444");
  const [borderWidth, setBorderWidth] = useState(0);
  const [bgShadow, setBgShadow] = useState(18);
  const [canvasW, setCanvasW] = useState<number | "">("");
  const [canvasH, setCanvasH] = useState<number | "">("");
  const [canvasBgType, setCanvasBgType] = useState("dark");
  const [canvasBgColor, setCanvasBgColor] = useState("#1a1d27");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [jpegQuality, setJpegQuality] = useState(90);
  const [generated, setGenerated] = useState<GeneratedItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressCode, setProgressCode] = useState("");
  const [isImgEditorOpen, setIsImgEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"blocks" | "stamp" | "canvas">("blocks");
  const [rightTab, setRightTab] = useState<"position" | "bulk">("position");
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);
  const [imageTargetBlockId, setImageTargetBlockId] = useState<string | null>(null);

  const buildCode = (num: number) => `${(prefix || "A").toUpperCase()}${separator}${String(num).padStart(5, "0")}`;
  const activeImage = useMemo(() => {
    if (!editedImageData) return loadedImage;
    const cv = document.createElement("canvas");
    cv.width = editedImageData.width;
    cv.height = editedImageData.height;
    cv.getContext("2d")?.putImageData(editedImageData, 0, 0);
    return cv;
  }, [loadedImage, editedImageData]);

  const loadImageFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setLoadedImage(img);
        setEditedImageData(null);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const loadStampBgFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setStampBgImage(img);
        setStampBgDataUrl(String(reader.result));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const rrPath = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const measureBlock = (ctx: CanvasRenderingContext2D, b: Block, code: string, scale = 1) => {
    if (!b.visible) return { w: 0, h: 0 };
    if (b.type === "text") {
      const fs = b.fontSize * scale;
      ctx.font = `${b.italic ? "italic " : ""}${b.fontWeight} ${fs}px Inter, sans-serif`;
      const lines = b.text.split("\n");
      const w = Math.max(...lines.map((line) => ctx.measureText(line).width + b.letterSpacing * (line.length - 1)));
      return { w, h: lines.length * fs * 1.3 + 4 };
    }
    if (b.type === "code") {
      const fs = b.fontSize * scale;
      ctx.font = `${b.fontWeight} ${fs}px Inter, sans-serif`;
      return { w: ctx.measureText(code).width, h: fs * 1.35 };
    }
    if (b.type === "icon") return { w: b.size * scale, h: b.size * scale * 1.2 + 2 };
    if (b.type === "image") return { w: b.imgW * scale, h: b.imgH * scale + 4 };
    if (b.type === "divider") return { w: 80, h: b.margin * 2 + b.thickness };
    return { w: 0, h: (b as SpacerBlock).height * scale };
  };

  const drawBlock = (ctx: CanvasRenderingContext2D, b: Block, code: string, x: number, y: number, maxW: number, scale = 1) => {
    if (b.type === "text") {
      const fs = b.fontSize * scale;
      ctx.font = `${b.italic ? "italic " : ""}${b.fontWeight} ${fs}px Inter, sans-serif`;
      ctx.fillStyle = b.color;
      const lines = b.text.split("\n");
      const lh = fs * 1.3;
      lines.forEach((line, i) => {
        const tw = ctx.measureText(line).width;
        const tx = b.align === "center" ? x + (maxW - tw) / 2 : b.align === "right" ? x + maxW - tw : x;
        ctx.fillText(line, tx, y + fs + i * lh);
      });
      return;
    }
    if (b.type === "code") {
      const fs = b.fontSize * scale;
      ctx.font = `${b.fontWeight} ${fs}px Inter, sans-serif`;
      ctx.fillStyle = b.color;
      const tw = ctx.measureText(code).width;
      const tx = b.align === "center" ? x + (maxW - tw) / 2 : b.align === "right" ? x + maxW - tw : x;
      ctx.fillText(code, tx, y + fs);
      return;
    }
    if (b.type === "icon") {
      const sz = b.size * scale;
      ctx.font = `${sz}px serif`;
      const tx = b.align === "center" ? x + (maxW - sz) / 2 : b.align === "right" ? x + maxW - sz : x;
      ctx.fillText(b.icon, tx, y + sz);
      return;
    }
    if (b.type === "image" && b.image) {
      const iw = b.imgW * scale;
      const ih = b.imgH * scale;
      const tx = b.align === "center" ? x + (maxW - iw) / 2 : b.align === "right" ? x + maxW - iw : x;
      ctx.drawImage(b.image, tx, y, iw, ih);
      return;
    }
    if (b.type === "divider") {
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.thickness * scale;
      ctx.beginPath();
      ctx.moveTo(x, y + b.margin + b.thickness / 2);
      ctx.lineTo(x + maxW, y + b.margin + b.thickness / 2);
      ctx.stroke();
    }
  };

  const drawToContext = (cv: HTMLCanvasElement, ctx: CanvasRenderingContext2D, img: HTMLImageElement | HTMLCanvasElement | null, code: string) => {
    if (!img) {
      cv.width = 800;
      cv.height = 500;
      ctx.fillStyle = "#edf2f7";
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#5b6473";
      ctx.font = "500 17px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload an image to get started", cv.width / 2, cv.height / 2);
      return;
    }
    const srcW = "naturalWidth" in img ? img.naturalWidth : img.width;
    const srcH = "naturalHeight" in img ? img.naturalHeight : img.height;
    cv.width = Number(canvasW) || srcW;
    cv.height = Number(canvasH) || srcH;

    if (canvasBgType === "solid") {
      ctx.fillStyle = canvasBgColor;
      ctx.fillRect(0, 0, cv.width, cv.height);
    } else if (canvasBgType === "gradient") {
      const g = ctx.createLinearGradient(0, 0, cv.width, cv.height);
      g.addColorStop(0, canvasBgColor);
      g.addColorStop(1, "#f4f7ff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cv.width, cv.height);
    } else {
      ctx.fillStyle = "#f6f8fc";
      ctx.fillRect(0, 0, cv.width, cv.height);
    }

    const cRatio = cv.width / cv.height;
    const iRatio = srcW / srcH;
    let dw: number;
    let dh: number;
    let dx: number;
    let dy: number;
    if (Number(canvasW) || Number(canvasH)) {
      if (cRatio > iRatio) {
        dw = cv.width;
        dh = cv.width / iRatio;
        dx = 0;
        dy = (cv.height - dh) / 2;
      } else {
        dh = cv.height;
        dw = cv.height * iRatio;
        dy = 0;
        dx = (cv.width - dw) / 2;
      }
    } else {
      dw = srcW;
      dh = srcH;
      dx = 0;
      dy = 0;
    }
    ctx.drawImage(img, dx, dy, dw, dh);

    const scale = stampScale / 100;
    const m = Math.round(cv.width * 0.025);
    let maxW = 0;
    let totalH = 0;
    blocks.forEach((b) => {
      if (!b.visible) return;
      const size = measureBlock(ctx, b, code, scale);
      maxW = Math.max(maxW, size.w);
      totalH += size.h;
    });
    const stampW = Math.max(maxW, 60) + bgPadding * 2;
    const stampH = totalH + bgPadding * 2;
    const [vert, horiz] = selectedPos.split("-") as ["top" | "mid" | "bottom", "left" | "center" | "right"];
    let x = horiz === "left" ? m : horiz === "right" ? cv.width - stampW - m : (cv.width - stampW) / 2;
    let y = vert === "top" ? m : vert === "bottom" ? cv.height - stampH - m : (cv.height - stampH) / 2;
    x += offsetX;
    y += offsetY;

    const drawBg = (px: number, py: number) => {
      if (bgStyle === "none") return;
      ctx.save();
      ctx.globalAlpha = bgOpacity / 100;
      if (bgShadow > 0) {
        ctx.shadowColor = "rgba(30,41,59,0.2)";
        ctx.shadowBlur = bgShadow;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 6;
      }
      rrPath(ctx, px, py, stampW, stampH, bgRadius);
      if (bgStyle === "image" && stampBgImage) {
        rrPath(ctx, px, py, stampW, stampH, bgRadius);
        ctx.clip();
        const iRatio = stampBgImage.width / stampBgImage.height;
        const bRatio = stampW / stampH;
        let iw: number;
        let ih: number;
        let ix: number;
        let iy: number;
        if (bRatio > iRatio) {
          iw = stampW;
          ih = stampW / iRatio;
          ix = px;
          iy = py + (stampH - ih) / 2;
        } else {
          ih = stampH;
          iw = stampH * iRatio;
          ix = px + (stampW - iw) / 2;
          iy = py;
        }
        ctx.drawImage(stampBgImage, ix, iy, iw, ih);
      } else if (bgStyle === "solid") {
        ctx.fillStyle = bgColor1;
      } else {
        const rad = (bgGradDir * Math.PI) / 180;
        const g = ctx.createLinearGradient(px, py, px + Math.cos(rad) * stampW, py + Math.sin(rad) * stampH);
        g.addColorStop(0, bgColor1);
        g.addColorStop(1, bgColor2);
        ctx.fillStyle = g;
      }
      ctx.fill();
      ctx.globalAlpha = 1;
      if (borderWidth > 0) {
        rrPath(ctx, px, py, stampW, stampH, bgRadius);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.stroke();
      }
      ctx.restore();
    };

    if (stampRotation !== 0) {
      ctx.save();
      ctx.translate(x + stampW / 2, y + stampH / 2);
      ctx.rotate((stampRotation * Math.PI) / 180);
      drawBg(-stampW / 2, -stampH / 2);
      let cy = -stampH / 2 + bgPadding;
      blocks.forEach((b) => {
        if (!b.visible) return;
        const size = measureBlock(ctx, b, code, scale);
        ctx.save();
        ctx.globalAlpha = (b.opacity ?? 100) / 100;
        drawBlock(ctx, b, code, -stampW / 2 + bgPadding + b.posX * scale, cy + b.posY * scale, stampW - bgPadding * 2, scale);
        ctx.restore();
        cy += size.h;
      });
      ctx.restore();
    } else {
      drawBg(x, y);
      let cy = y + bgPadding;
      blocks.forEach((b) => {
        if (!b.visible) return;
        const size = measureBlock(ctx, b, code, scale);
        ctx.save();
        ctx.globalAlpha = (b.opacity ?? 100) / 100;
        drawBlock(ctx, b, code, x + bgPadding + b.posX * scale, cy + b.posY * scale, stampW - bgPadding * 2, scale);
        ctx.restore();
        cy += size.h;
      });
    }
  };

  const renderCanvas = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    drawToContext(cv, ctx, activeImage, buildCode(rangeFrom));
  };

  useEffect(() => {
    renderCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeImage,
    blocks,
    selectedPos,
    offsetX,
    offsetY,
    stampScale,
    stampRotation,
    bgStyle,
    bgColor1,
    bgColor2,
    stampBgImage,
    bgGradDir,
    bgRadius,
    bgPadding,
    bgOpacity,
    borderColor,
    borderWidth,
    bgShadow,
    canvasW,
    canvasH,
    canvasBgType,
    canvasBgColor,
    prefix,
    separator,
    rangeFrom,
  ]);

  const onUploadMain = (e: ChangeEvent<HTMLInputElement>) => loadImageFile(e.target.files?.[0]);

  const addBlock = (type: BlockType) => {
    if (type === "text")
      setBlocks((v) => [...v, { id: uid(), type, visible: true, text: "New text", fontSize: 18, fontWeight: "400", color: "#ffffff", align: "left", italic: false, letterSpacing: 0, posX: 0, posY: 0, opacity: 100 }]);
    if (type === "code") setBlocks((v) => [...v, { id: uid(), type, visible: true, color: "#FFD700", fontSize: 32, fontWeight: "800", align: "left", posX: 0, posY: 0, opacity: 100 }]);
    if (type === "icon") setBlocks((v) => [...v, { id: uid(), type, visible: true, icon: "★", size: 32, align: "left", posX: 0, posY: 0, opacity: 100 }]);
    if (type === "divider") setBlocks((v) => [...v, { id: uid(), type, visible: true, color: "rgba(255,255,255,0.3)", thickness: 1, margin: 6, posX: 0, posY: 0, opacity: 100 }]);
    if (type === "spacer") setBlocks((v) => [...v, { id: uid(), type, visible: true, height: 10, posX: 0, posY: 0, opacity: 100 }]);
    if (type === "image") blockImgInputRef.current?.click();
  };

  const updateBlock = (id: string, patch: Partial<Block>) =>
    setBlocks((v) => v.map((b) => (b.id === id ? { ...b, ...patch } as Block : b)));
  const deleteBlock = (id: string) => setBlocks((v) => v.filter((b) => b.id !== id));
  const moveBlock = (id: string, dir: -1 | 1) =>
    setBlocks((v) => {
      const idx = v.findIndex((x) => x.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= v.length) return v;
      const c = [...v];
      [c[idx], c[next]] = [c[next], c[idx]];
      return c;
    });

  const onAddImageBlock = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (imageTargetBlockId) {
          updateBlock(imageTargetBlockId, { dataUrl: String(r.result), image: img } as Partial<Block>);
          setImageTargetBlockId(null);
        } else {
          const b: ImageBlock = { id: uid(), type: "image", visible: true, imgW: 48, imgH: 48, align: "left", posX: 0, posY: 0, opacity: 100, dataUrl: String(r.result), image: img };
          setBlocks((v) => [...v, b]);
        }
      };
      img.src = String(r.result);
    };
    r.readAsDataURL(f);
    e.target.value = "";
  };

  const generateAll = async () => {
    if (!activeImage || !offscreenRef.current || rangeFrom > rangeTo) return;
    setIsGenerating(true);
    setGenerated([]);
    const offscreen = offscreenRef.current;
    const offCtx = offscreen.getContext("2d");
    if (!offCtx) return;
    const items: GeneratedItem[] = [];
    const total = rangeTo - rangeFrom + 1;
    for (let i = 0; i < total; i += 1) {
      const num = rangeFrom + i;
      const code = buildCode(num);
      setProgressCode(code);
      drawToContext(offscreen, offCtx, activeImage, code);
      const blob = await new Promise<Blob | null>((resolve) => offscreen.toBlob(resolve, format === "jpeg" ? "image/jpeg" : "image/png", jpegQuality / 100));
      if (blob) {
        items.push({ code, blob, previewDataUrl: offscreen.toDataURL("image/jpeg", 0.4), ext: format === "jpeg" ? "jpg" : "png" });
      }
      setProgress(Math.round(((i + 1) / total) * 100));
      if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }
    setGenerated(items);
    setIsGenerating(false);
  };

  const downloadZip = async () => {
    if (!generated.length) return;
    const zip = new JSZip();
    const folder = zip.folder(`promo_${prefix || "A"}`);
    generated.forEach((item) => folder?.file(`${item.code}.${item.ext}`, item.blob));
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `promo_${prefix || "A"}.zip`;
    a.click();
  };

  const rangePreview = `${buildCode(rangeFrom)} → ${buildCode(rangeTo)} | ${Math.max(0, rangeTo - rangeFrom + 1)} images`;
  const toHexColor = (value: string) => (/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff");
  const blockIcon = (type: BlockType) => ({ text: "TXT", code: "CODE", icon: "ICON", image: "IMG", divider: "DIV", spacer: "SP" }[type]);
  const blockTitle = (b: Block) => {
    if (b.type === "text") return b.text.slice(0, 24) || "Text";
    if (b.type === "code") return "Code (AXXXXX)";
    if (b.type === "icon") return `Icon: ${b.icon}`;
    if (b.type === "image") return "Mini Image";
    if (b.type === "divider") return "Divider Line";
    return "Spacer";
  };

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>Promo Studio Pro</div>
        <button className={styles.btn} onClick={() => fileInputRef.current?.click()}>
          Upload Image
        </button>
        <button className={styles.btn} onClick={() => setIsImgEditorOpen(true)} disabled={!loadedImage}>
          Edit Image
        </button>
        <button className={styles.btnPrimary} onClick={renderCanvas}>
          Preview
        </button>
        <div className={styles.spacer} />
        <div className={styles.badge}>{loadedImage ? `${loadedImage.naturalWidth}x${loadedImage.naturalHeight}` : "No image"}</div>
      </header>

      <div className={styles.layout}>
        <aside className={styles.leftPanel}>
          <div className={styles.tabs}>
            <button className={activeTab === "blocks" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("blocks")}>Blocks</button>
            <button className={activeTab === "stamp" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("stamp")}>Stamp</button>
            <button className={activeTab === "canvas" ? styles.tabActive : styles.tab} onClick={() => setActiveTab("canvas")}>Canvas</button>
          </div>
          {activeTab === "blocks" && (
            <div className={styles.panelBody}>
              <div className={styles.secTitle}>Content Blocks</div>
              {blocks.map((b) => (
                <div key={b.id} className={styles.blockCard}>
                  <div className={styles.blockHead}>
                    <button className={styles.blockTitleBtn} onClick={() => setOpenBlockId((v) => (v === b.id ? null : b.id))}>
                      <span className={styles.blockTypeBadge}>{blockIcon(b.type)}</span>
                      <span>{blockTitle(b)}</span>
                    </button>
                    <div className={styles.blockActions}>
                      <button className={styles.iconBtn} onClick={() => updateBlock(b.id, { visible: !b.visible })}>{b.visible ? "●" : "○"}</button>
                      <button className={styles.iconBtn} onClick={() => moveBlock(b.id, -1)}>↑</button>
                      <button className={styles.iconBtn} onClick={() => moveBlock(b.id, 1)}>↓</button>
                      <button className={styles.iconBtn} onClick={() => deleteBlock(b.id)}>×</button>
                    </div>
                  </div>
                  {openBlockId === b.id && (
                    <div className={styles.blockBody}>
                      {b.type === "icon" && (
                        <>
                          <label>Icon / Symbol</label>
                          <input type="text" maxLength={3} value={b.icon} onChange={(e) => updateBlock(b.id, { icon: e.target.value || "★" } as Partial<Block>)} />
                          <div className={styles.row}>
                            <div className={styles.field}>
                              <label>Size</label>
                              <input type="number" value={b.size} onChange={(e) => updateBlock(b.id, { size: Number(e.target.value) } as Partial<Block>)} />
                            </div>
                            <div className={styles.field}>
                              <label>Align</label>
                              <select value={b.align} onChange={(e) => updateBlock(b.id, { align: e.target.value as Align } as Partial<Block>)}>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}
                      {b.type === "text" && (
                        <>
                          <label>Text</label>
                          <textarea value={b.text} onChange={(e) => updateBlock(b.id, { text: e.target.value } as Partial<Block>)} />
                          <div className={styles.row}>
                            <div className={styles.field}>
                              <label>Font Size</label>
                              <input type="number" value={b.fontSize} onChange={(e) => updateBlock(b.id, { fontSize: Number(e.target.value) } as Partial<Block>)} />
                            </div>
                            <div className={styles.field}>
                              <label>Weight</label>
                              <select value={b.fontWeight} onChange={(e) => updateBlock(b.id, { fontWeight: e.target.value } as Partial<Block>)}>
                                <option value="300">Light</option>
                                <option value="400">Regular</option>
                                <option value="600">Semi-Bold</option>
                                <option value="700">Bold</option>
                                <option value="800">Black</option>
                              </select>
                            </div>
                          </div>
                          <div className={styles.field}>
                            <label>Color</label>
                            <div className={styles.colorRow}>
                              <input type="color" value={toHexColor(b.color)} onChange={(e) => updateBlock(b.id, { color: e.target.value } as Partial<Block>)} />
                              <input type="text" value={b.color} onChange={(e) => updateBlock(b.id, { color: e.target.value } as Partial<Block>)} />
                            </div>
                          </div>
                          <div className={styles.row}>
                            <div className={styles.field}>
                              <label>Align</label>
                              <select value={b.align} onChange={(e) => updateBlock(b.id, { align: e.target.value as Align } as Partial<Block>)}>
                                <option value="left">Left</option>
                                <option value="center">Center</option>
                                <option value="right">Right</option>
                              </select>
                            </div>
                            <div className={styles.field}>
                              <label>Italic</label>
                              <input type="checkbox" checked={b.italic} onChange={(e) => updateBlock(b.id, { italic: e.target.checked } as Partial<Block>)} />
                            </div>
                          </div>
                        </>
                      )}
                      {b.type === "code" && (
                        <>
                          <p className={styles.note}>Promo code value is injected automatically during bulk export.</p>
                          <div className={styles.row}>
                            <div className={styles.field}>
                              <label>Font Size</label>
                              <input type="number" value={b.fontSize} onChange={(e) => updateBlock(b.id, { fontSize: Number(e.target.value) } as Partial<Block>)} />
                            </div>
                            <div className={styles.field}>
                              <label>Weight</label>
                              <select value={b.fontWeight} onChange={(e) => updateBlock(b.id, { fontWeight: e.target.value } as Partial<Block>)}>
                                <option value="600">Semi-Bold</option>
                                <option value="700">Bold</option>
                                <option value="800">Black</option>
                              </select>
                            </div>
                          </div>
                          <div className={styles.field}>
                            <label>Color</label>
                            <div className={styles.colorRow}>
                              <input type="color" value={toHexColor(b.color)} onChange={(e) => updateBlock(b.id, { color: e.target.value } as Partial<Block>)} />
                              <input type="text" value={b.color} onChange={(e) => updateBlock(b.id, { color: e.target.value } as Partial<Block>)} />
                            </div>
                          </div>
                          <div className={styles.field}>
                            <label>Align</label>
                            <select value={b.align} onChange={(e) => updateBlock(b.id, { align: e.target.value as Align } as Partial<Block>)}>
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                        </>
                      )}
                      {b.type === "divider" && (
                        <>
                          <div className={styles.field}>
                            <label>Color</label>
                            <div className={styles.colorRow}>
                              <input type="color" value={toHexColor(b.color)} onChange={(e) => updateBlock(b.id, { color: e.target.value } as Partial<Block>)} />
                              <input type="text" value={b.color} onChange={(e) => updateBlock(b.id, { color: e.target.value } as Partial<Block>)} />
                            </div>
                          </div>
                          <div className={styles.row}>
                            <div className={styles.field}>
                              <label>Thickness</label>
                              <input type="number" value={b.thickness} onChange={(e) => updateBlock(b.id, { thickness: Number(e.target.value) } as Partial<Block>)} />
                            </div>
                            <div className={styles.field}>
                              <label>Margin Y</label>
                              <input type="number" value={b.margin} onChange={(e) => updateBlock(b.id, { margin: Number(e.target.value) } as Partial<Block>)} />
                            </div>
                          </div>
                        </>
                      )}
                      {b.type === "spacer" && (
                        <div className={styles.field}>
                          <label>Height</label>
                          <input type="number" value={b.height} onChange={(e) => updateBlock(b.id, { height: Number(e.target.value) } as Partial<Block>)} />
                        </div>
                      )}
                      {b.type === "image" && (
                        <>
                          {b.dataUrl ? <img src={b.dataUrl} alt="mini" className={styles.miniPreview} /> : null}
                          <button className={styles.btn} onClick={() => { setImageTargetBlockId(b.id); blockImgInputRef.current?.click(); }}>
                            Replace Image
                          </button>
                          <div className={styles.row}>
                            <div className={styles.field}>
                              <label>Width</label>
                              <input type="number" value={b.imgW} onChange={(e) => updateBlock(b.id, { imgW: Number(e.target.value) } as Partial<Block>)} />
                            </div>
                            <div className={styles.field}>
                              <label>Height</label>
                              <input type="number" value={b.imgH} onChange={(e) => updateBlock(b.id, { imgH: Number(e.target.value) } as Partial<Block>)} />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className={styles.rowWrap}>
                {(["text", "code", "icon", "image", "divider", "spacer"] as BlockType[]).map((t) => (
                  <button key={t} className={styles.addBtn} onClick={() => addBlock(t)}>{t}</button>
                ))}
              </div>
            </div>
          )}
          {activeTab === "stamp" && (
            <div className={styles.panelBody}>
              <label>BG Style</label>
              <select value={bgStyle} onChange={(e) => setBgStyle(e.target.value)}>
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
                <option value="image">Image</option>
                <option value="none">None</option>
              </select>
              {bgStyle === "image" && (
                <div className={styles.stampBgWrap}>
                  {stampBgDataUrl ? <img src={stampBgDataUrl} alt="Stamp background" className={styles.stampBgPreview} /> : <div className={styles.stampBgPlaceholder}>No stamp background image</div>}
                  <div className={styles.row}>
                    <button className={styles.btn} type="button" onClick={() => stampBgInputRef.current?.click()}>
                      {stampBgImage ? "Replace Background" : "Upload Background"}
                    </button>
                    {stampBgImage ? (
                      <button
                        className={styles.btn}
                        type="button"
                        onClick={() => {
                          setStampBgImage(null);
                          setStampBgDataUrl("");
                          setBgStyle("gradient");
                        }}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
              <label>Color 1</label>
              <input type="color" value={bgColor1} onChange={(e) => setBgColor1(e.target.value)} />
              <label>Color 2</label>
              <input type="color" value={bgColor2} onChange={(e) => setBgColor2(e.target.value)} />
              <label>Padding {bgPadding}</label>
              <input type="range" min={4} max={70} value={bgPadding} onChange={(e) => setBgPadding(Number(e.target.value))} />
              <label>Radius {bgRadius}</label>
              <input type="range" min={0} max={60} value={bgRadius} onChange={(e) => setBgRadius(Number(e.target.value))} />
              <label>Gradient Direction {bgGradDir}</label>
              <input type="range" min={0} max={360} value={bgGradDir} onChange={(e) => setBgGradDir(Number(e.target.value))} />
              <label>Opacity {bgOpacity}</label>
              <input type="range" min={0} max={100} value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} />
              <label>Border Color</label>
              <input type="color" value={borderColor} onChange={(e) => setBorderColor(e.target.value)} />
              <label>Border Width {borderWidth}</label>
              <input type="range" min={0} max={8} value={borderWidth} onChange={(e) => setBorderWidth(Number(e.target.value))} />
              <label>Shadow {bgShadow}</label>
              <input type="range" min={0} max={50} value={bgShadow} onChange={(e) => setBgShadow(Number(e.target.value))} />
            </div>
          )}
          {activeTab === "canvas" && (
            <div className={styles.panelBody}>
              <label>Width</label>
              <input type="number" value={canvasW} placeholder="Auto" onChange={(e) => setCanvasW(e.target.value ? Number(e.target.value) : "")} />
              <label>Height</label>
              <input type="number" value={canvasH} placeholder="Auto" onChange={(e) => setCanvasH(e.target.value ? Number(e.target.value) : "")} />
              <label>Canvas Background</label>
              <select value={canvasBgType} onChange={(e) => setCanvasBgType(e.target.value)}>
                <option value="dark">Dark Surface</option>
                <option value="solid">Solid</option>
                <option value="gradient">Gradient</option>
              </select>
              <label>Canvas Color</label>
              <input type="color" value={canvasBgColor} onChange={(e) => setCanvasBgColor(e.target.value)} />
            </div>
          )}
        </aside>

        <main className={styles.canvasArea}>
          <div className={styles.canvasToolbar}>
            <button className={styles.btn} onClick={() => setZoom((v) => Math.max(10, v - 10))}>-</button>
            <span>{zoom}%</span>
            <button className={styles.btn} onClick={() => setZoom((v) => Math.min(400, v + 10))}>+</button>
          </div>
          <div className={styles.canvasWrap}>
            <canvas ref={canvasRef} className={styles.canvas} style={{ transform: `scale(${zoom / 100})` }} />
          </div>
        </main>

        <aside className={styles.rightPanel}>
          <div className={styles.tabs}>
            <button className={rightTab === "position" ? styles.tabActive : styles.tab} onClick={() => setRightTab("position")}>Position</button>
            <button className={rightTab === "bulk" ? styles.tabActive : styles.tab} onClick={() => setRightTab("bulk")}>Bulk</button>
          </div>
          {rightTab === "position" && (
            <div className={styles.panelBody}>
              <div className={styles.grid3}>
                {(["top-left", "top-center", "top-right", "mid-left", "mid-center", "mid-right", "bottom-left", "bottom-center", "bottom-right"] as PositionMode[]).map((p) => (
                  <button key={p} className={selectedPos === p ? styles.posActive : styles.posBtn} onClick={() => setSelectedPos(p)}>{p}</button>
                ))}
              </div>
              <label>X Offset {offsetX}</label>
              <input type="range" min={-300} max={300} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} />
              <label>Y Offset {offsetY}</label>
              <input type="range" min={-300} max={300} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} />
              <label>Scale {stampScale}%</label>
              <input type="range" min={50} max={300} value={stampScale} onChange={(e) => setStampScale(Number(e.target.value))} />
              <label>Rotation {stampRotation}°</label>
              <input type="range" min={-45} max={45} value={stampRotation} onChange={(e) => setStampRotation(Number(e.target.value))} />
            </div>
          )}
          {rightTab === "bulk" && (
            <div className={styles.panelBody}>
              <label>Prefix</label>
              <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
              <label>Separator</label>
              <select value={separator} onChange={(e) => setSeparator(e.target.value)}>
                <option value="">None</option><option value="-">Dash</option><option value="_">Underscore</option>
              </select>
              <label>Range</label>
              <div className={styles.row}>
                <input type="number" value={rangeFrom} onChange={(e) => setRangeFrom(Number(e.target.value))} />
                <input type="number" value={rangeTo} onChange={(e) => setRangeTo(Number(e.target.value))} />
              </div>
              <div className={styles.preview}>{rangePreview}</div>
              <label>Format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value as ExportFormat)}>
                <option value="png">PNG</option><option value="jpeg">JPEG</option>
              </select>
              {format === "jpeg" && (
                <>
                  <label>JPEG Quality {jpegQuality}</label>
                  <input type="range" min={50} max={100} value={jpegQuality} onChange={(e) => setJpegQuality(Number(e.target.value))} />
                </>
              )}
              <button className={styles.btnPrimary} onClick={generateAll} disabled={!loadedImage || isGenerating}>Generate All</button>
              <div className={styles.progress}>Progress: {progress}% {isGenerating ? `(${progressCode})` : ""}</div>
              <button className={styles.btnSuccess} onClick={downloadZip} disabled={!generated.length}>Download ZIP</button>
              <div className={styles.thumbGrid}>
                {generated.map((g) => (
                  <div key={g.code} className={styles.thumb}>
                    <img src={g.previewDataUrl} alt={g.code} />
                    <span>{g.code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {isImgEditorOpen && (
        <div className={styles.modal}>
          <div className={styles.modalCard}>
            <h3>Image Editor (basic)</h3>
            <p>Adjustments are prepared; apply closes editor.</p>
            <canvas ref={editCanvasRef} className={styles.editCanvas} />
            <div className={styles.row}>
              <button className={styles.btnPrimary} onClick={() => setIsImgEditorOpen(false)}>Apply & Close</button>
              <button className={styles.btn} onClick={() => setIsImgEditorOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onUploadMain} />
      <input ref={blockImgInputRef} type="file" accept="image/*" hidden onChange={onAddImageBlock} />
      <input ref={stampBgInputRef} type="file" accept="image/*" hidden onChange={(e) => loadStampBgFile(e.target.files?.[0])} />
      <canvas ref={offscreenRef} hidden />
    </div>
  );
}
