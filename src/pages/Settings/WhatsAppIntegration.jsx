import React, { useEffect, useState } from "react";
import { apiClient, errorMessage } from "../../api/client";
import { toast } from "sonner";
import { MessageCircle, RefreshCw, Link2Off, ShieldCheck } from "lucide-react";

export default function WhatsAppIntegration() {
  const [info, setInfo] = useState(null),
    [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  const load = async () => {
    setBusy("refresh");
    try {
      const { data } = await apiClient.get("/integrations/whatsapp/status/");
      setInfo(data);
      setError(data.detail || "");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    load();
  }, []);
  const perform = async (action, payload) => {
    setBusy(action);
    setError("");
    try {
      const { data } = await apiClient.post(
        `/integrations/whatsapp/${action}/`,
        payload || {},
      );
      setInfo((prev) => ({ ...prev, ...data }));
      toast.success(
        action === "connect"
          ? "WhatsApp pairing started"
          : action === "disconnect"
            ? "WhatsApp disconnected"
            : "Settings saved",
      );
      if (action === "disconnect") await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy("");
    }
  };
  const qr = info?.qr;
  const qrSrc = qr?.startsWith("data:image/")
    ? qr
    : qr?.startsWith("iVBOR")
      ? `data:image/png;base64,${qr}`
      : null;
  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          WhatsApp Integration
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Connect Aroma Artist's WhatsApp to send PDF invoices to customers.
        </p>
      </div>
      <section className="rounded-2xl bg-white border border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex flex-wrap justify-between gap-3 items-center">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-emerald-600" />
            <div>
              <h2 className="font-semibold">WhatsApp Business Connection</h2>
              <p className="text-xs text-slate-500">
                {info?.instance_name || "Instance not provisioned"}
              </p>
            </div>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${info?.connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
          >
            {info?.connected ? "Connected" : info?.state || "Not connected"}
          </span>
        </div>
        {error && (
          <div
            role="alert"
            className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}
        {qrSrc && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-5">
            <img
              alt="WhatsApp pairing QR code"
              src={qrSrc}
              className="w-56 h-56 object-contain"
            />
            <p className="text-sm text-slate-600">
              WhatsApp → Linked devices → Link a device
            </p>
          </div>
        )}
        {qr && !qrSrc && (
          <p className="text-sm text-amber-700">
            Pairing data was returned but not as an image. Check the WhatsApp
            provider QR response format.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            disabled={!!busy || info?.connected}
            onClick={() => perform("connect")}
            className="px-4 py-2 rounded-lg bg-[#172B4D] text-white disabled:opacity-50"
          >
            Connect WhatsApp
          </button>
          <button
            disabled={!!busy}
            onClick={load}
            className="px-4 py-2 rounded-lg border flex items-center gap-2"
          >
            <RefreshCw size={16} /> Refresh Status
          </button>
          <button
            disabled={!!busy || !info?.connected}
            onClick={() => {
              if (window.confirm("Disconnect WhatsApp?")) perform("disconnect");
            }}
            className="px-4 py-2 rounded-lg border text-rose-700 flex items-center gap-2 disabled:opacity-50"
          >
            <Link2Off size={16} /> Disconnect
          </button>
        </div>
      </section>
      <section className="rounded-2xl bg-white border border-slate-200 p-5 space-y-3">
        <h2 className="font-semibold flex gap-2 items-center">
          <ShieldCheck size={18} /> Invoice delivery settings
        </h2>
        <label className="flex gap-3 items-start">
          <input
            type="checkbox"
            checked={!!info?.auto_send}
            disabled
            title="Automatic delivery is not enabled in this build"
            className="mt-1"
          />
          <span>
            <strong>Automatically send invoice PDF after checkout</strong>
            <small className="block text-slate-500">
              Enable only after confirming customer consent and backend
              automation deployment. Manual invoice sending is available in
              Sales → Invoices.
            </small>
          </span>
        </label>
        <p className="text-xs text-amber-700">
          Automatic checkout dispatch requires a background worker integration
          and is not activated by this frontend setting alone.
        </p>
      </section>
    </div>
  );
}
