import type { MutableRefObject, RefObject } from "react";
import type { ChartRange, TradingViewWidget } from "@/components/stock-chart/types";

type ScreenshotTarget = {
  takeClientScreenshot?: (...args: unknown[]) => unknown;
  takeScreenshot?: (...args: unknown[]) => unknown;
  getScreenshot?: (...args: unknown[]) => unknown;
  image?: (...args: unknown[]) => unknown;
  imageCanvas?: (...args: unknown[]) => unknown;
  subscribe?: (event: string, callback: (arg: unknown) => void) => void;
  unsubscribe?: (event: string, callback: (arg: unknown) => void) => void;
};

type CaptureArgs = {
  widgetRef: MutableRefObject<TradingViewWidget | null>;
  chartContainerRef: RefObject<HTMLDivElement>;
  isChartReadyRef: MutableRefObject<boolean>;
};

const ignoreExpectedCaptureFailure = (): undefined => undefined;

const resolveCaptureFailure = (
  resolve: (value: string | undefined) => void,
  value?: string
) => resolve(value);

export const triggerDownload = (
  url: string,
  tickerSymbol: string,
  activeRange: ChartRange
) => {
  const captureSuffix = `${Math.floor(Date.now() / 1000)}`;
  const safeSymbol = tickerSymbol.replace(/[^a-zA-Z0-9-_]/g, "_");
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeSymbol.toUpperCase()}_${activeRange}_${captureSuffix}.png`;
  link.rel = "noreferrer";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => link.remove(), 0);
};

export const buildShareUrl = (id: string) => {
  if (typeof window === "undefined") return `/chart/${id}`;
  return `${window.location.origin}/chart/${encodeURIComponent(id)}`;
};

export const captureChartImage = async ({
  widgetRef,
  chartContainerRef,
  isChartReadyRef,
}: CaptureArgs): Promise<string | undefined> => {
  if (!widgetRef.current || !chartContainerRef.current) return;
  const widget = widgetRef.current as TradingViewWidget & {
    onChartReady?: (cb: () => void) => void;
  };

  if (!isChartReadyRef.current) {
    if (typeof widget.onChartReady === "function") {
      await new Promise<void>((resolve) => {
        widget.onChartReady?.(() => {
          isChartReadyRef.current = true;
          resolve();
        });
      });
    } else {
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
    }
  }

  if (!widgetRef.current || !chartContainerRef.current) return;

  const chartingWidget = widgetRef.current as TradingViewWidget & {
    activeChart?: () => ScreenshotTarget;
    chart?: (index?: number) => ScreenshotTarget;
  };

  const toDataUrl = async (shot: unknown): Promise<string | undefined> => {
    const formatCreatedLabel = () =>
      `Created on ${new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date())}`;

    const stampCanvas = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
      const output = document.createElement("canvas");
      output.width = canvas.width;
      output.height = canvas.height;
      const ctx = output.getContext("2d");
      if (!ctx) return canvas;

      ctx.drawImage(canvas, 0, 0);

      const footerHeight = Math.max(30, Math.min(72, Math.round(output.height * 0.06)));
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, output.height - footerHeight, output.width, footerHeight);

      const headerHeight = Math.min(44, Math.round(output.height * 0.045));
      ctx.fillStyle = "#09090b";
      ctx.fillRect(0, 0, output.width, headerHeight);

      ctx.fillStyle = "#d4d4d8";
      const fontSize = Math.max(11, Math.min(18, headerHeight - 6));
      ctx.font = `${500} ${fontSize}px "Inter", Arial, sans-serif`;
      ctx.textBaseline = "middle";
      const label = formatCreatedLabel();
      const metrics = ctx.measureText(label);
      const textY = headerHeight / 2;
      const maxTextWidth = Math.max(1, output.width - 24);
      const scale = Math.min(1, maxTextWidth / Math.max(1, metrics.width));
      ctx.save();
      ctx.translate(12, textY);
      ctx.scale(scale, 1);
      ctx.fillText(label, 0, 0);
      ctx.restore();

      return output;
    };

    if (!shot) return;
    if (typeof shot === "string") {
      if (shot.startsWith("data:")) {
        return shot;
      }

      if (shot.startsWith("blob:") || shot.startsWith("http")) {
        try {
          const response = await fetch(shot);
          const blob = await response.blob();
          return await toDataUrl(blob);
        } catch {
          return ignoreExpectedCaptureFailure();
        }
      }

      const compact = shot.trim();
      if (/^[A-Za-z0-9+/=\s]+$/.test(compact)) {
        return `data:image/png;base64,${compact}`;
      }

      return;
    }
    if (shot instanceof HTMLCanvasElement) {
      return stampCanvas(shot).toDataURL("image/png");
    }
    if (shot instanceof Blob) {
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(shot);
      });
    }
    if (shot instanceof ArrayBuffer) {
      const blob = new Blob([shot], { type: "image/png" });
      return await toDataUrl(blob);
    }
    if (typeof shot === "object") {
      const payload = shot as Record<string, unknown>;
      if (typeof payload.base64 === "string") {
        return payload.base64.startsWith("data:")
          ? payload.base64
          : `data:image/png;base64,${payload.base64}`;
      }
      if (typeof payload.data === "string") {
        const data = payload.data;
        return data.startsWith("data:") ? data : `data:image/png;base64,${data}`;
      }
      if (typeof payload.dataURL === "string") return payload.dataURL;
      if (typeof payload.dataUri === "string") return payload.dataUri;
      if (typeof payload.dataURI === "string") return payload.dataURI;
      if (typeof payload.image === "string") return payload.image;
      if (payload.blob instanceof Blob) {
        return await toDataUrl(payload.blob);
      }
      if (typeof payload.blob === "string") {
        return payload.blob.startsWith("data:")
          ? payload.blob
          : `data:image/png;base64,${payload.blob}`;
      }
      if (typeof payload.content === "string") return payload.content;
      if (typeof payload.snapshot === "string") return payload.snapshot;
    }
  };

  const invokeCaptureMethod = async (
    method?: (...args: unknown[]) => unknown,
    owner?: object,
    preferredArgSets: unknown[][] = []
  ): Promise<string | undefined> => {
    if (typeof method !== "function") return;

    const callArgsList = preferredArgSets.length ? preferredArgSets : [[]];

    const callWithArgs = async (callArgs: unknown[]): Promise<string | undefined> => {
      try {
        const direct = await Promise.resolve(
          (method as (...args: unknown[]) => unknown).apply(owner, callArgs)
        );
        return toDataUrl(direct);
      } catch {
        return ignoreExpectedCaptureFailure();
      }
    };

    for (const args of callArgsList) {
      const preferredResult = await callWithArgs(args);
      if (preferredResult) return preferredResult;
    }

    const normalizeResult = async (value: unknown): Promise<string | undefined> => {
      if (value === undefined) return;
      const direct = await toDataUrl(value);
      if (direct) return direct;

      if (value instanceof Promise) {
        try {
          return await toDataUrl(await value);
        } catch {
          return ignoreExpectedCaptureFailure();
        }
      }
      return;
    };

    const invokeWithArgs = async (args: unknown[]): Promise<string | undefined> => {
      return await new Promise<string | undefined>((resolve) => {
        let settled = false;
        const timeout = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          resolve(undefined);
        }, 4000);

        const done = async (value: unknown) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timeout);
          resolve(await normalizeResult(value));
        };

        const callArgs = args.map((arg) =>
          typeof arg === "function" ? done : arg
        );

        try {
          const direct = (method as (...args: unknown[]) => unknown).apply(owner, callArgs);
          if (direct !== undefined) {
            normalizeResult(direct).then((value) => {
              if (!settled && value) {
                settled = true;
                window.clearTimeout(timeout);
                resolve(value);
              }
            });
          }
        } catch {
          window.clearTimeout(timeout);
          if (!settled) {
            settled = true;
            resolveCaptureFailure(resolve);
          }
        }
      });
    };

    const callbackVariants: unknown[][] = [
      [(value: unknown) => value],
      [{ watermark: false }, (value: unknown) => value],
      [{}, (value: unknown) => value],
      [false, (value: unknown) => value],
      [null, (value: unknown) => value],
      [{ watermark: false, style: "light" }, (value: unknown) => value],
      [{}, false, (value: unknown) => value],
    ];

    for (const args of callbackVariants) {
      const callbackPayload = await invokeWithArgs(args);
      if (callbackPayload) return callbackPayload;
    }
  };

  const takeFromObject = async (target?: ScreenshotTarget) => {
    if (!target) return;
    const imageCanvasResult = await invokeCaptureMethod(target.imageCanvas, target, [
      [{ watermark: false }],
      [{}],
    ]);
    if (imageCanvasResult) return imageCanvasResult;

    if (typeof target.takeClientScreenshot === "function") {
      try {
        const shot = await Promise.resolve(target.takeClientScreenshot());
        const dataUrl = await toDataUrl(shot);
        if (dataUrl) return dataUrl;
      } catch {
        return ignoreExpectedCaptureFailure();
      }

      if (target.takeClientScreenshot.length >= 1) {
        try {
          const shot = await Promise.resolve(target.takeClientScreenshot({}));
          return toDataUrl(shot);
        } catch {
          return ignoreExpectedCaptureFailure();
        }
      }
    }

    if (typeof target.getScreenshot === "function") {
      try {
        const shot = await Promise.resolve(target.getScreenshot());
        return toDataUrl(shot);
      } catch {
        return ignoreExpectedCaptureFailure();
      }
    }
  };

  const screenshotFromEvent = async (target: ScreenshotTarget) => {
    if (typeof target.takeScreenshot !== "function") return;
    if (typeof target.subscribe !== "function" || typeof target.unsubscribe !== "function") {
      return;
    }

    return await new Promise<string | undefined>((resolve) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        target.unsubscribe?.("onScreenshotReady", onReady);
        resolve(undefined);
      }, 5000);

      const finalize = async (value: unknown) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        target.unsubscribe?.("onScreenshotReady", onReady);
        resolve(await toDataUrl(value));
      };

      const onReady = async (value: unknown) => {
        try {
          await finalize(value);
        } catch {
          if (!settled) {
            settled = true;
            target.unsubscribe?.("onScreenshotReady", onReady);
            window.clearTimeout(timeout);
            resolveCaptureFailure(resolve);
          }
        }
      };

      target.subscribe?.("onScreenshotReady", onReady);

      try {
        if (target.takeScreenshot.length >= 1) {
          target.takeScreenshot(onReady);
          return;
        }
        target.takeScreenshot();
      } catch {
        settled = true;
        target.unsubscribe?.("onScreenshotReady", onReady);
        window.clearTimeout(timeout);
        resolveCaptureFailure(resolve);
      }
    });
  };

  const takeViaPostMessage = async (target: TradingViewWidget) => {
    if (!target?.postMessage?.get) return;

    const commands = ["takeScreenshot", "take_screenshot", "screenshot"];

    for (const command of commands) {
      const result = await new Promise<string | undefined>((resolve) => {
        const timeout = window.setTimeout(() => {
          window.clearTimeout(timeout);
          resolve(undefined);
        }, 3500);

        try {
          target.postMessage?.get?.(command, {}, (shot: unknown) => {
            window.clearTimeout(timeout);
            toDataUrl(shot)
              .then((value) => resolve(value))
              .catch(() => resolveCaptureFailure(resolve));
          });
        } catch {
          window.clearTimeout(timeout);
          resolveCaptureFailure(resolve);
        }
      });

      if (result) return result;
    }
  };

  const takeDirect = async () => {
    return await takeFromObject(chartingWidget);
  };

  const takeChartObject = async () => {
    const chartObj =
      chartingWidget.activeChart?.() ??
      chartingWidget.chart?.() ??
      chartingWidget.chart?.(0);

    const chartResult = await takeFromObject(chartObj);
    if (chartResult) return chartResult;

    if (chartObj?.takeScreenshot) {
      const eventResult = await screenshotFromEvent(chartObj);
      if (eventResult) return eventResult;

      const shot = await Promise.resolve(chartObj.takeScreenshot());
      return toDataUrl(shot);
    }
  };

  const takeServer = async (target?: { takeScreenshot?: (...args: unknown[]) => unknown }) => {
    if (!target?.takeScreenshot) return;
    const takeScreenshot = target.takeScreenshot;

    const normalize = (value: unknown): string | undefined => {
      if (typeof value === "string") return value;
      if (typeof value === "object" && value) {
        const record = value as Record<string, unknown>;
        if (typeof record.url === "string") return record.url;
        if (typeof record.data === "string") return record.data;
        if (typeof record.image === "string") return record.image;
      }
      return undefined;
    };

    try {
      const direct = await Promise.resolve(takeScreenshot());
      const directUrl = await toDataUrl(direct);
      if (directUrl) return directUrl;
    } catch {
      ignoreExpectedCaptureFailure();
    }

    return await new Promise<string | undefined>((resolve) => {
      const timer = window.setTimeout(() => {
        window.clearTimeout(timer);
        resolve(undefined);
      }, 4000);

      const resolveWith = (shot: unknown) => {
        window.clearTimeout(timer);
        resolve(normalize(shot));
      };

      try {
        if (takeScreenshot.length >= 1) {
          try {
            takeScreenshot(resolveWith);
            return;
          } catch {
            ignoreExpectedCaptureFailure();
          }
        }
        if (takeScreenshot.length >= 2) {
          takeScreenshot({}, resolveWith);
          return;
        }
      } catch {
        resolveCaptureFailure(resolve);
        return;
      }

      resolveCaptureFailure(resolve);
    });
  };

  const directResult = await takeDirect();
  if (directResult) return directResult;

  const chartObjResult = await takeChartObject();
  if (chartObjResult) return chartObjResult;

  const directEventResult = await screenshotFromEvent(chartingWidget);
  if (directEventResult) return directEventResult;

  const serverResult = await takeServer(chartingWidget);
  if (serverResult) return serverResult;

  const messageResult = await takeViaPostMessage(chartingWidget);
  if (messageResult) return messageResult;

  const chartServerResult = await takeServer(
    chartingWidget.activeChart?.() ??
    chartingWidget.chart?.() ??
    chartingWidget.chart?.(0)
  );
  if (chartServerResult) return chartServerResult;

  const own = Object.keys(chartingWidget);
  const proto = Object.getPrototypeOf(chartingWidget) ?? {};
  const protoMethods = Object.getOwnPropertyNames(proto);
  console.warn(
    "SnapCharts screenshot unavailable. Available widget methods:",
    { own, protoMethods }
  );

  const canvases = Array.from(chartContainerRef.current.querySelectorAll("canvas"));
  if (canvases.length === 0) return;

  const bounds = chartContainerRef.current.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.floor(bounds.width * dpr));
  output.height = Math.max(1, Math.floor(bounds.height * dpr));
  const ctx = output.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#09090b";
  ctx.fillRect(0, 0, bounds.width, bounds.height);

  canvases.forEach((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const x = rect.left - bounds.left;
    const y = rect.top - bounds.top;
    ctx.drawImage(canvas, x, y, rect.width, rect.height);
  });

  const stampedDataUrl = await toDataUrl(output);
  if (stampedDataUrl) {
    return stampedDataUrl;
  }
};
