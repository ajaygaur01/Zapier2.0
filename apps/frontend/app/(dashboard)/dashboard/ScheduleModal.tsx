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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Schedule Automation" size="sm">
      <div className="flex flex-col gap-4">
        {fetching ? (
          <div className="py-8 text-center text-neutral-500">Loading schedule...</div>
        ) : (
          <>
            <p className="text-body text-neutral-600">
              Choose how often you want this automation to run automatically.
            </p>
            
            <div className="flex flex-col gap-1.5">
              <label className="block text-body-sm font-medium text-neutral-700">
                Frequency
              </label>
              <select
                value={scheduleType}
                onChange={handleTypeChange}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-body text-neutral-900 transition-colors duration-fast focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="minute">Every Minute</option>
                <option value="hour">Every Hour</option>
                <option value="day">Every Day (Midnight)</option>
                <option value="week">Every Week (Monday)</option>
                <option value="custom">Custom (Advanced)</option>
              </select>
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

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {hasExistingSchedule && (
                <Button variant="secondary" onClick={handleDelete} disabled={loading}>
                  Remove Schedule
                </Button>
              )}
              <Button variant="primary" onClick={handleSave} disabled={loading || !cronExpression.trim()}>
                {loading ? "Saving..." : "Save Schedule"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
