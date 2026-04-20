"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "@/app/config";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  zapId: string | null;
}

const PRESETS: Record<string, string> = {
  minute: "* * * * *",
  hour: "0 * * * *",
  day: "0 0 * * *",
  week: "0 0 * * 1",
  custom: "",
};

export function ScheduleModal({ isOpen, onClose, zapId }: ScheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [cronExpression, setCronExpression] = useState("* * * * *");
  const [scheduleType, setScheduleType] = useState("minute");
  const [hasExistingSchedule, setHasExistingSchedule] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !zapId) return;
    
    setFetching(true);
    setError("");
    setCronExpression("* * * * *");
    setScheduleType("minute");
    setHasExistingSchedule(false);

    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios
      .get(`${BACKEND_URL}/api/v1/zap/${zapId}/schedule`, { headers })
      .then((res) => {
        if (res.data.schedule && res.data.schedule.isActive) {
          const fetchedCron = res.data.schedule.cronExpression;
          setCronExpression(fetchedCron);
          setHasExistingSchedule(true);
          
          // Determine if it matches a preset
          const presetEntry = Object.entries(PRESETS).find(([k, v]) => v === fetchedCron && k !== "custom");
          if (presetEntry) {
            setScheduleType(presetEntry[0]);
          } else {
            setScheduleType("custom");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to fetch schedule", err);
      })
      .finally(() => {
        setFetching(false);
      });
  }, [isOpen, zapId]);

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setScheduleType(val);
    if (val !== "custom") {
      setCronExpression(PRESETS[val]);
    }
  };

  const handleSave = async () => {
    if (!cronExpression.trim()) {
      setError("Please enter a valid schedule");
      return;
    }

    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      await axios.post(
        `${BACKEND_URL}/api/v1/zap/${zapId}/schedule`,
        { cronExpression },
        { headers }
      );
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save schedule");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      await axios.delete(`${BACKEND_URL}/api/v1/zap/${zapId}/schedule`, {
        headers,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove schedule");
    } finally {
      setLoading(false);
    }
  };

  if (!zapId) return null;

  const PRESET_LABELS: Record<string, { label: string; desc: string }> = {
    minute: { label: "Every Minute", desc: "Runs every 60 seconds" },
    hour:   { label: "Every Hour",   desc: "Runs at the start of each hour" },
    day:    { label: "Every Day",    desc: "Runs daily at midnight" },
    week:   { label: "Every Week",   desc: "Runs every Monday at midnight" },
    custom: { label: "Custom",       desc: "Specify a cron expression" },
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Automation" size="sm">
      <div className="flex flex-col gap-5">
        {fetching ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-brand-200 border-t-brand-500 animate-spin" />
            <p className="text-body-sm text-neutral-400">Loading schedule…</p>
          </div>
        ) : (
          <>
            <p className="text-body text-neutral-500 leading-relaxed">
              Choose how often you want this automation to run automatically.
            </p>

            {/* Frequency selector */}
            <div className="flex flex-col gap-1.5">
              <label className="block text-body-sm font-semibold text-neutral-700 tracking-tight">
                Frequency
              </label>
              <div className="relative">
                <select
                  value={scheduleType}
                  onChange={handleTypeChange}
                  className="w-full appearance-none rounded-xl border border-neutral-200 bg-neutral-50/50 px-4 py-2.5 pr-10 text-body text-neutral-900 transition-all duration-normal hover:border-neutral-300 hover:bg-white focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                >
                  {Object.entries(PRESET_LABELS).map(([val, { label }]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                {/* Custom chevron */}
                <svg
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {scheduleType !== "custom" && (
                <p className="text-caption text-neutral-400 leading-relaxed">
                  {PRESET_LABELS[scheduleType]?.desc}
                </p>
              )}
            </div>

            {scheduleType === "custom" && (
              <Input
                label="Cron Expression"
                placeholder="* * * * *"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                error={error}
                hint="Format: minute hour day month day-of-week"
              />
            )}

            {/* Non-custom error */}
            {error && scheduleType !== "custom" && (
              <p className="text-body-sm text-red-500 flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {hasExistingSchedule && (
                <Button variant="ghostDanger" onClick={handleDelete} disabled={loading}>
                  {loading ? "Removing…" : "Remove Schedule"}
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={loading || !cronExpression.trim()}
              >
                {loading ? (
                  <>
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Schedule"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
