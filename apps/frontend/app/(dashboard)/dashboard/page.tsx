"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BACKEND_URL, HOOKS_URL } from "@/app/config";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScheduleModal } from "./ScheduleModal";

interface Zap {
  id: string;
  triggerId: string;
  userId: number;
  actions: {
    id: string;
    zapId: string;
    actionId: string;
    sortingOrder: number;
    type: { id: string; name: string; image: string };
  }[];
  trigger: {
    id: string;
    zapId: string;
    triggerId: string;
    type: { id: string; name: string; image: string };
  };
}

function useZaps() {
  const [loading, setLoading] = useState(true);
  const [zaps, setZaps] = useState<Zap[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    if (token && token.trim()) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    axios
      .get(`${BACKEND_URL}/api/v1/zap`, { headers })
      .then((res) => {
        setZaps(res.data.zaps);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching zaps:", err);
        setLoading(false);
      });
  }, []);

  return { loading, zaps };
}

export default function DashboardPage() {
  const { loading, zaps } = useZaps();
  const router = useRouter();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [activeZapId, setActiveZapId] = useState<string | null>(null);

  return (
    <div className="container-content py-10">

      {/* ── Page Header ─────────────────────────────────── */}
      <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-caption font-bold uppercase tracking-widest text-brand-500">
            Workspace
          </p>
          <h1 className="text-display-sm font-bold tracking-tight text-neutral-900">
            My Automations
          </h1>
          <p className="mt-1.5 text-body text-neutral-500 leading-relaxed">
            Manage and monitor all your active workflows
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => router.push("/zap/create")}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create automation
        </Button>
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      {loading ? (
        <Card padding="lg">
          <TableSkeleton rows={6} cols={5} />
        </Card>
      ) : zaps.length === 0 ? (
        <EmptyState
          title="No automations yet"
          description="Create your first workflow to connect your apps and automate tasks."
          action={{
            label: "Create automation",
            onClick: () => router.push("/zap/create"),
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_1px_4px_0_rgb(0_0_0_/_0.06),0_0_0_1px_rgb(0_0_0_/_0.03)]">
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-neutral-200/70 bg-neutral-50/90 backdrop-blur-sm">
                  <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-neutral-400">
                    Workflow
                  </th>
                  <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-neutral-400">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-neutral-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-caption font-bold uppercase tracking-widest text-neutral-400">
                    Webhook URL
                  </th>
                  <th className="px-6 py-4 text-right text-caption font-bold uppercase tracking-widest text-neutral-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {zaps.map((z, i) => (
                  <tr
                    key={z.id}
                    style={{ animationDelay: `${i * 60}ms` }}
                    className="group animate-fade-in-up opacity-0 [animation-fill-mode:forwards] transition-colors duration-fast hover:bg-brand-50/40"
                  >
                    {/* Workflow icons + name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2.5">
                          <div className="relative z-10 h-9 w-9 overflow-hidden rounded-xl ring-2 ring-white shadow-soft">
                            <img
                              src={z.trigger.type.image}
                              alt={z.trigger.type.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          {z.actions.map((x, idx) => (
                            <div
                              key={x.id}
                              style={{ zIndex: 9 - idx }}
                              className="relative h-9 w-9 overflow-hidden rounded-xl ring-2 ring-white shadow-soft"
                            >
                              <img
                                src={x.type.image}
                                alt={x.type.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-body-sm font-semibold text-neutral-800">
                            {z.trigger.type.name}
                          </p>
                          {z.actions.length > 0 && (
                            <p className="truncate text-caption text-neutral-400">
                              → {z.actions.map((a) => a.type.name).join(" → ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ID pill */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg border border-neutral-200/80 bg-neutral-100 px-2.5 py-1 font-mono text-caption text-neutral-500">
                        {z.id.slice(0, 8)}…
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-1 text-caption font-semibold text-emerald-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </td>

                    {/* Webhook URL */}
                    <td className="max-w-[200px] px-6 py-4">
                      <span
                        className="block cursor-default truncate font-mono text-caption text-neutral-400 transition-colors hover:text-neutral-600"
                        title={`${HOOKS_URL}/hooks/catch/1/${z.id}`}
                      >
                        {`${HOOKS_URL}/hooks/catch/1/${z.id}`}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setActiveZapId(z.id);
                            setScheduleModalOpen(true);
                          }}
                        >
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
                            />
                          </svg>
                          Schedule
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push("/zap/" + z.id)}
                        >
                          Open
                          <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          <div className="border-t border-neutral-100 bg-neutral-50/60 px-6 py-3">
            <p className="text-caption text-neutral-400">
              {zaps.length} automation{zaps.length !== 1 ? "s" : ""} total
            </p>
          </div>
        </div>
      )}

      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => {
          setScheduleModalOpen(false);
          setActiveZapId(null);
        }}
        zapId={activeZapId}
      />
    </div>
  );
}
