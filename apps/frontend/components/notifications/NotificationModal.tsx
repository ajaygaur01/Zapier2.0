"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

export type NotificationItem = {
  type?: string;
  userId?: string | number;
  zapId?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  [key: string]: any;
};

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
}

export function NotificationModal({
  isOpen,
  onClose,
  notifications,
}: NotificationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Notifications (${notifications.length})`}
      size="lg"
    >
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center">
            <p className="text-body font-medium text-neutral-900">No notifications yet</p>
            <p className="mt-2 text-body-sm text-neutral-500">
              Your zap history will appear here when workflows are processed.
            </p>
          </div>
        ) : (
          notifications.map((notification, index) => {
            const timestamp = notification.timestamp ? new Date(notification.timestamp) : null;
            return (
              <div
                key={`${notification.zapId ?? index}-${notification.timestamp ?? index}`}
                className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-body font-semibold text-neutral-900 truncate">
                      {notification.message || "Zap notification received"}
                    </p>
                    <div className="mt-2 text-body-sm text-neutral-500 space-y-1">
                      {notification.zapId && (
                        <p>
                          <span className="font-semibold text-neutral-700">Zap ID:</span>{" "}
                          {notification.zapId}
                        </p>
                      )}
                      {timestamp && (
                        <p>
                          <span className="font-semibold text-neutral-700">Time:</span>{" "}
                          {timestamp.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                        notification.status === "success"
                          ? "bg-emerald-100 text-emerald-700"
                          : notification.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {notification.status || "Info"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="mt-8 flex justify-end">
        <Button variant="secondary" size="md" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
