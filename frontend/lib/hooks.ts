import { useState, useEffect } from 'react';
import { isAuthenticationError } from './api';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    read: boolean;
    createdAt: string;
}

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    // Mock initial notifications for demo
    useEffect(() => {
        // In a real app, fetch from API or SSE
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const addNotification = (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
        const newNotification: Notification = {
            ...notification,
            id: Math.random().toString(36).substring(7),
            read: false,
            createdAt: new Date().toISOString(),
        };
        setNotifications(prev => [newNotification, ...prev]);
    };

    return { notifications, unreadCount, markRead, markAllRead, addNotification };
}

export function useBatchProgress(batchId: string | null) {
    const [progress, setProgress] = useState<{ total: number; processed: number; failed: number } | null>(null);

    useEffect(() => {
        if (!batchId) {
            setProgress(null);
            return;
        }

        // Mock progress simulation for now since we don't have a real batch API yet
        // In reality, this would poll an endpoint like /ingestion/batch/:id
        setProgress({ total: 0, processed: 0, failed: 0 });

        // Cleanup
        return () => setProgress(null);
    }, [batchId]);

    return progress;
}
