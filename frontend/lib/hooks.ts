import { useState, useEffect } from 'react';
import { Notification, fetchNotifications, markNotificationRead, markAllNotificationsRead } from './api';

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        try {
            const data = await fetchNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        } catch (error) {
            console.error('Failed to load notifications', error);
        }
    };

    useEffect(() => {
        loadNotifications();
        const interval = setInterval(loadNotifications, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const markRead = async (id: string) => {
        try {
            await markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Failed to mark read', error);
        }
    };

    const markAllRead = async () => {
        try {
            await markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Failed to mark all read', error);
        }
    };

    return { notifications, unreadCount, markRead, markAllRead, refresh: loadNotifications };
}

import { fetchBatchProgress } from './api';

export function useBatchProgress(batchId: string | null) {
    const [progress, setProgress] = useState<{ total: number, processed: number, failed: number, pending: number } | null>(null);

    useEffect(() => {
        if (!batchId) return;

        const poll = async () => {
            try {
                const data = await fetchBatchProgress(batchId);
                setProgress(data);
            } catch (error) {
                console.error('Failed to load batch progress', error);
            }
        };

        poll();
        const interval = setInterval(poll, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, [batchId]);

    return progress;
}
